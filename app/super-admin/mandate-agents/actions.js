'use server';

import { authorize } from '@/lib/auth/session';

export async function listMandateAgentStats() {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  try {
    const data = await a.api.get('/api/super-admin/v1/mandates/agent-stats');
    return { data };
  } catch (error) {
    return { error: error.message || 'Could not load mandate statistics.' };
  }
}
