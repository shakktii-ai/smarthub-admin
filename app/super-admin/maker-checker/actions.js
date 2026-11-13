'use server';

import { revalidatePath } from 'next/cache';
import { authorize } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rateLimit';

const QUEUE = '/api/audit/v1/maker-checker';
const PAGE_SIZE = 50;
const STATUSES = ['pending', 'approved', 'rejected'];

const clean = (value, max) => {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, max) : null;
};

const positiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

// The queue only stores the action code. These three codes have a domain route
// that records the decision *and* applies the effect; everything else is decided
// on the generic queue route and applied elsewhere.
const DOMAIN_ROUTES = {
  settlement_batch_release: { kind: 'settlement', referenceKey: 'batch_ref' },
  refund_approve: { kind: 'refund', referenceKey: 'merchant_refund_id' },
  dispute_resolve: { kind: 'dispute', referenceKey: 'dispute_ref' },
};

const routeFor = (action, payload) => {
  const route = DOMAIN_ROUTES[action];
  if (!route) return { kind: 'generic' };
  const value = payload && payload[route.referenceKey];
  if (value === undefined || value === null || String(value).trim() === '') {
    return { kind: 'invalid', referenceKey: route.referenceKey };
  }
  return { kind: route.kind, reference: String(value) };
};

const emptyCounts = {
  pending: 0,
  approved: 0,
  rejected: 0,
  total: 0,
  minePending: 0,
  readyForYou: 0,
};

// One page of the queue plus the numbers above it. The four counts are separate
// `limit=1` reads because the list endpoint already returns `total`; asking it
// for a status and throwing the row away is cheaper than downloading every
// request and counting in the browser.
export async function loadApprovals(filters = {}) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return {
      error: a.error,
      rows: [],
      total: 0,
      page: 1,
      limit: PAGE_SIZE,
      counts: emptyCounts,
      me: null,
    };
  }

  const page = Math.max(1, Number(filters.page) || 1);
  const status = STATUSES.includes(filters.status) ? filters.status : null;
  const params = { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };
  if (status) params.status = status;

  const action = clean(filters.action, 100);
  if (action) params.action = action;
  const maker = positiveInt(filters.maker);
  if (maker) params.maker_id = maker;
  const search = clean(filters.q, 100);
  if (search) params.q = search;

  const count = async (extra = {}) => {
    try {
      const res = await a.api.get(QUEUE, { limit: 1, ...extra });
      return Number(res?.total) || 0;
    } catch {
      // A broken count must not turn a readable table into an error page.
      return 0;
    }
  };

  try {
    const [res, pending, approved, rejected, total, minePending] = await Promise.all([
      a.api.get(QUEUE, params),
      count({ status: 'pending' }),
      count({ status: 'approved' }),
      count({ status: 'rejected' }),
      count(),
      count({ status: 'pending', maker_id: a.profile.id }),
    ]);

    return {
      rows: res?.items ?? [],
      total: Number(res?.total) || 0,
      page,
      limit: PAGE_SIZE,
      counts: {
        pending,
        approved,
        rejected,
        total,
        minePending,
        // Every pending request not raised by this signed-in user is a candidate
        // for them to check. The backend still enforces the maker/checker rule.
        readyForYou: Math.max(0, pending - minePending),
      },
      me: { id: a.profile.id, name: a.profile.full_name || a.profile.email },
    };
  } catch (error) {
    return {
      error: error.message || 'Could not load the approval queue.',
      rows: [],
      total: 0,
      page,
      limit: PAGE_SIZE,
      counts: emptyCounts,
      me: { id: a.profile.id, name: a.profile.full_name || a.profile.email },
    };
  }
}

// Record a decision in the queue and, for the three known request types, on the
// business object itself. The action string and payload are re-read from the
// queue rather than trusted from the browser: the browser only says "request 41,
// approve" and the server decides what that request actually is.
export async function decideApproval({ id, approve, note } = {}) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  const requestId = positiveInt(id);
  if (!requestId) {
    return { error: 'Unknown approval request.' };
  }
  if (typeof approve !== 'boolean') {
    return { error: 'Choose approve or reject.' };
  }

  const { profile, api } = a;
  if (!rateLimit(`approval-decide:${profile.id}`, 60)) {
    return { error: 'Too many decisions. Try again in a minute.' };
  }

  const decisionNote = clean(note, 500);

  if (!approve && (!decisionNote || decisionNote.length < 8)) {
    return {
      error:
        'A rejection needs a reason of at least 8 characters, because the maker has to act on it.',
    };
  }

  let row;
  try {
    row = await api.get(`${QUEUE}/${requestId}`);
  } catch (error) {
    return { error: error.message || 'Could not read that approval request.' };
  }

  if (!row) {
    return { error: 'That approval request no longer exists.' };
  }
  if (row.status !== 'pending') {
    return {
      error: `This request was already ${row.status}. Refresh the queue to see the decision.`,
    };
  }
  if (Number(row.maker_id) === Number(profile.id)) {
    return {
      error:
        'You raised this request. A second person has to be the checker, so you cannot decide it.',
    };
  }

  const route = routeFor(row.action, row.payload);
  if (route.kind === 'invalid') {
    return {
      error: `This ${row.action} request has no ${route.referenceKey} in its payload, so the domain action cannot be found. Refresh the queue or decide it from the owning screen.`,
    };
  }

  try {
    if (route.kind === 'generic') {
      await api.post(`${QUEUE}/${requestId}/decide`, {
        checker_id: profile.id,
        approve,
        note: decisionNote,
      });
    } else if (route.kind === 'settlement') {
      await api.post(
        `/api/settlement/v1/batches/${encodeURIComponent(route.reference)}/decision`,
        { checker_id: profile.id, approve, notes: decisionNote },
      );
    } else if (route.kind === 'refund') {
      await api.post(
        `/api/payments/v1/refunds/${encodeURIComponent(route.reference)}/decision`,
        { checker_id: profile.id, approve, note: decisionNote },
      );
    } else {
      await api.post(
        `/api/disputes/v1/disputes/${encodeURIComponent(route.reference)}/decision`,
        { checker_id: profile.id, approve, notes: decisionNote },
      );
    }

    revalidatePath('/super-admin/maker-checker');
    revalidatePath('/super-admin/dashboard');

    return {
      ok: true,
      applied: route.kind !== 'generic',
      message: approve
        ? route.kind === 'generic'
          ? 'Decision recorded. Apply the change on the screen that owns it.'
          : 'Approved and applied.'
        : 'Request rejected. The proposed change will not be applied.',
    };
  } catch (error) {
    if (error.code === 'maker_checker_same_actor') {
      return { error: 'You raised this request. A second person has to be the checker.' };
    }
    return { error: error.message || 'Could not record that decision.' };
  }
}
