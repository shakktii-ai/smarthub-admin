import 'server-only';
import { cache } from 'react';
import { ROLES } from '@/config/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

// Trusted profile of the signed-in user, read from the database on every request. Null if signed out, inactive or role-less.
export const getCurrentProfile = cache(async () => {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) return null;
  const { data } = await createAdminClient().from('profiles').select('id, full_name, email, role, is_active, organization_id').eq('id', user.id).maybeSingle();
  if (!data || !data.is_active || !ROLES[data.role]) return null;
  return data;
});

// Use at the top of every server action / route handler. Returns { error, status } or { profile, admin }.
export async function authorize(roles) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: 'Please sign in again.', status: 401 };
  if (roles && !roles.includes(profile.role)) return { error: 'You do not have permission to do this.', status: 403 };
  return { profile, admin: createAdminClient() };
}
