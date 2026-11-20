'use server';

import { authorize } from '@/lib/auth/session';

const t = (x) => String(x || '').trim();

export async function listAgentApplications({ status = '', page = 1, pageSize = 20 } = {}) {
  const a = await authorize(['super_admin']);
  if (a.error) return { error: a.error };

  const safePage = Math.max(1, Number(page) || 1);
  const safeSize = Math.min(100, Math.max(1, Number(pageSize) || 20));

  try {
    const params = { limit: safeSize, offset: (safePage - 1) * safeSize };
    if (['submitted', 'approved', 'rejected'].includes(status)) {
      params.status = status;
    }
    const data = await a.api.get('/api/super-admin/v1/agent-applications', params);
    return { data };
  } catch (error) {
    return { error: error.message || 'Could not load agent applications.' };
  }
}

export async function approveAgentApplication(id, note) {
  const a = await authorize(['super_admin']);
  if (a.error) return { error: a.error };

  const applicationId = Number(id);
  if (!Number.isFinite(applicationId) || applicationId <= 0) {
    return { error: 'Invalid application.' };
  }

  try {
    const data = await a.api.post(
      `/api/super-admin/v1/agent-applications/${applicationId}/approve`,
      { decision_note: t(note) || undefined },
    );
    return { ok: true, data };
  } catch (error) {
    if (error.status === 404) return { error: 'Application not found.' };
    return { error: error.message || 'Could not approve the application.' };
  }
}

export async function rejectAgentApplication(id, note) {
  const a = await authorize(['super_admin']);
  if (a.error) return { error: a.error };

  const applicationId = Number(id);
  if (!Number.isFinite(applicationId) || applicationId <= 0) {
    return { error: 'Invalid application.' };
  }

  try {
    const data = await a.api.post(
      `/api/super-admin/v1/agent-applications/${applicationId}/reject`,
      { decision_note: t(note) || undefined },
    );
    return { ok: true, data };
  } catch (error) {
    if (error.status === 404) return { error: 'Application not found.' };
    return { error: error.message || 'Could not reject the application.' };
  }
}
