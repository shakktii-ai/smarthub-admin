import 'server-only';
import { createClient } from '@supabase/supabase-js';

// Privileged client. Server-only: bypasses RLS, so ALWAYS authorize the caller first (see lib/auth/session.js).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Server is not configured');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
