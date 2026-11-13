'use server';

import { authorize } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rateLimit';

const LOGS_PATH = '/api/audit/v1/logs';
const FACETS_PATH = '/api/audit/v1/logs/facets';
const USERS_PATH = '/api/identity/v1/users';

// The trail stores naive UTC; an operator picks days on the Indian calendar.
// A picked day is sent as its UTC span without a suffix, because a suffixed
// value would be compared against a timestamp-without-time-zone column.
const IST_OFFSET_MS = 19.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function utcStamp(ms) {
  const d = new Date(ms);
  return Number.isNaN(d.valueOf()) ? null : d.toISOString().slice(0, 19);
}

function dayStart(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
  const [y, m, d] = value.split('-').map(Number);
  return utcStamp(Date.UTC(y, m - 1, d) - IST_OFFSET_MS);
}

function dayEnd(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
  const [y, m, d] = value.split('-').map(Number);
  return utcStamp(Date.UTC(y, m - 1, d) - IST_OFFSET_MS + DAY_MS - 1000);
}

const clean = (value, max) => {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, max) : null;
};

export async function listAuditEvents(filters = {}) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  const page = Math.max(1, Number(filters.page) || 1);
  const limit = 100;
  const params = {
    limit,
    offset: (page - 1) * limit,
  };

  const actor = Number(filters.actor);
  if (Number.isInteger(actor) && actor > 0) params.actor_id = actor;
  const action = clean(filters.action, 100);
  if (action) params.action = action;
  const resource = clean(filters.resource, 100);
  if (resource) params.resource_type = resource;
  const resourceId = clean(filters.resourceId, 100);
  if (resourceId) params.resource_id = resourceId;
  const search = clean(filters.q, 100);
  if (search) params.q = search;
  const from = dayStart(filters.from);
  const to = dayEnd(filters.to);
  if (from) params.from = from;
  if (to) params.to = to;

  try {
    const res = await a.api.get(LOGS_PATH, params);
    return {
      rows: res?.items ?? [],
      total: Number(res?.total) || 0,
      limit,
      page,
    };
  } catch (error) {
    return { error: error.message || 'Could not load the audit trail.' };
  }
}

export async function listAuditFacets(from) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { actions: [], resources: [] };
  }

  const windowStart = dayStart(from);
  try {
    const res = await a.api.get(FACETS_PATH, windowStart ? { from: windowStart } : {});
    return {
      actions: res?.actions ?? [],
      resources: res?.resources ?? [],
    };
  } catch {
    // A failed dropdown must not take the table down with it.
    return { actions: [], resources: [] };
  }
}

export async function searchAuditActors(query) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error, actors: [] };
  }

  const text = clean(query, 100);
  if (!rateLimit(`audit-actors:${a.profile.id}`, 40)) {
    return { error: 'Too many searches. Try again in a minute.', actors: [] };
  }

  try {
    const res = await a.api.get(USERS_PATH, { limit: 20, ...(text ? { q: text } : {}) });
    return {
      actors: (res?.items ?? []).map((u) => ({
        id: u.id,
        name: u.full_name || u.email,
        email: u.email,
        roles: u.roles || [],
      })),
    };
  } catch (error) {
    return { error: error.message || 'Could not search users.', actors: [] };
  }
}
