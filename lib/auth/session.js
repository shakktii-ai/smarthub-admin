import 'server-only';
import { cache } from 'react';
import { ROLES } from '@/config/auth';
import { serverApi } from '@/lib/api/server';
import { pickDashboardRole } from '@/lib/api/tokens';

// Trusted profile of the signed-in user, read from the backend on every request. Null if signed
// out, inactive or role-less. GET /me returns 401 when the token is forged, expired, or the
// session has been revoked, so the backend - not this app - is the authority on who is active.
export const getCurrentProfile = cache(async () => {
  if (!serverApi.hasUsableSession()) return null;
  let me;
  try {
    me = await serverApi.get('/api/identity/v1/me');
  } catch {
    return null;
  }
  if (!me || !me.is_active) return null;
  const role = pickDashboardRole(me.roles);
  if (!role || !ROLES[role]) return null;
  return {
    id: me.id,
    email: me.email,
    full_name: me.full_name,
    phone: me.phone,
    role,
    roles: me.roles || [],
    is_active: me.is_active,
    status: me.status,
    mfa_enabled: me.mfa_enabled,
    // The dashboard's tenancy key was Supabase organization_id; the backend scopes by branch.
    organization_id: me.branch_code || null,
    branch_code: me.branch_code || null,
    merchant_code: me.merchant_code || null,
  };
});

// Use at the top of every server action / route handler. Returns { error, status } or { profile, api }.
export async function authorize(roles) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: 'Please sign in again.', status: 401 };
  if (roles && !roles.includes(profile.role)) return { error: 'You do not have permission to do this.', status: 403 };
  return { profile, api: serverApi };
}
