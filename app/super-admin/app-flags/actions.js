'use server';

import { revalidatePath } from 'next/cache';
import { authorize } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rateLimit';

// The catalogue lives in the backend (app/features/settings/flags.py), so the
// panel never hard-codes a flag: a key added there shows up here on reload.
const FLAGS_PATH = '/api/settings/v1/merchant-app/flags';

export async function listAppFlags() {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  try {
    const res = await a.api.get(FLAGS_PATH);
    return { flags: res?.items ?? [] };
  } catch (error) {
    return { error: error.message || 'Could not load the app switches.' };
  }
}

export async function setAppFlag(key, enabled) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  const { profile, api } = a;
  const flagKey = String(key || '').trim();

  if (!flagKey || flagKey.length > 128) {
    return { error: 'Unknown switch.' };
  }

  if (!rateLimit(`app-flag:${profile.id}`, 30)) {
    return { error: 'Too many requests. Try again in a minute.' };
  }

  try {
    const flag = await api.put(
      `${FLAGS_PATH}/${encodeURIComponent(flagKey)}`,
      { enabled: Boolean(enabled) },
    );
    revalidatePath('/super-admin/app-flags');
    return { ok: true, flag };
  } catch (error) {
    return { error: error.message || 'Could not update the switch.' };
  }
}
