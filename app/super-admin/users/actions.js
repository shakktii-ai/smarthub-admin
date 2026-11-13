'use server';

import { revalidatePath } from 'next/cache';
import { ROLES } from '@/config/auth';
import { authorize } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rateLimit';
import { validateAdmin } from '@/lib/validators/admin';

const t = (x) => String(x || '').trim() || null;

// Backend AdminRole values are UPPER_SNAKE; the dashboard config uses lower_snake keys.
const toBackendRole = (role) => String(role).toUpperCase();
const fromBackendRole = (role) => String(role || '').toLowerCase();

const BRANCH_REQUIRED_ROLES = ['merchant_admin', 'collection_admin'];

const isUserId = (id) => /^\d+$/.test(String(id || ''));

export async function inviteAdmin(values) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  const { profile, api } = a;

  if (!rateLimit(`invite:${profile.id}`, 10)) {
    return { error: 'Too many requests. Try again in a minute.' };
  }

  const fieldErrors = validateAdmin(values || {});

  if (Object.keys(fieldErrors).length) {
    return { fieldErrors };
  }

  const email = String(values.email || '').trim().toLowerCase();

  if (BRANCH_REQUIRED_ROLES.includes(values.role) && !values.branchId) {
    return { fieldErrors: { branchId: 'Please select a valid branch.' } };
  }

  const password = String(values.password || '');

  if (
    password.length < 10 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/\d/.test(password)
  ) {
    return {
      fieldErrors: {
        password:
          'Use at least 10 characters with uppercase, lowercase and a number.',
      },
    };
  }

  try {
    await api.post('/api/identity/v1/users', {
      email,
      password,
      full_name: t(values.fullName),
      phone: t(values.mobile) || undefined,
      roles: [toBackendRole(values.role)],
      branch_code: values.branchId || undefined,
    });
  } catch (error) {
    if (error.status === 409) {
      return {
        fieldErrors: { email: 'An administrator with this email already exists.' },
      };
    }
    return { error: error.message || 'Could not create the administrator.' };
  }

  revalidatePath('/super-admin/users');

  return { ok: true };
}

export async function setAdminAccess(id, active, reason) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  const { profile, api } = a;

  if (!isUserId(id)) {
    return { error: 'Invalid administrator.' };
  }

  if (String(id) === String(profile.id)) {
    return { error: 'You cannot change your own access.' };
  }

  let target;
  try {
    target = await api.get(`/api/identity/v1/users/${id}`);
  } catch {
    return { error: 'Administrator not found.' };
  }

  if ((target.roles || []).map(fromBackendRole).includes('super_admin')) {
    return { error: 'Super Admin access cannot be changed here.' };
  }

  // User status is the backend's only access switch; it has no suspension-reason column,
  // so `reason` is reported back to the operator instead of being silently dropped.
  const note = String(reason || '').trim().slice(0, 300);

  try {
    await api.post(
      `/api/identity/v1/users/${id}/status`,
      {},
      { status: active ? 'active' : 'suspended' },
    );
  } catch (error) {
    return { error: error.message || 'Could not update access.' };
  }

  revalidatePath('/super-admin/users');

  return {
    ok: true,
    warning: note && !active ? 'Suspended. The reason is not stored on the account.' : undefined,
  };
}

// Resetting clears the authenticator, the recovery codes and every live session for that
// account, which is exactly what an operator needs told before pressing the button.
export async function resetAdminMfa(id) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  const { profile, api } = a;

  if (!isUserId(id)) {
    return { error: 'Invalid administrator.' };
  }

  if (String(id) === String(profile.id)) {
    return {
      error:
        'You cannot reset your own authenticator here. Use Security & MFA, which keeps you signed in.',
    };
  }

  if (!rateLimit(`mfa-reset:${profile.id}`, 10)) {
    return { error: 'Too many requests. Try again in a minute.' };
  }

  try {
    await api.post(`/api/identity/v1/users/${id}/mfa/reset`);
  } catch (error) {
    return { error: error.message || 'Could not reset the authenticator.' };
  }

  revalidatePath('/super-admin/users');

  return {
    ok: true,
    warning:
      'Authenticator cleared. That administrator is signed out everywhere and will enrol a new one at their next sign-in.',
  };
}

export async function listAdmins({
  q = '',
  role = '',
  status = '',
  page = 1,
  pageSize = 10,
} = {}) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  const { api } = a;

  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(
    100,
    Math.max(1, Number(pageSize) || 10)
  );

  const params = { limit: safePageSize, offset: (safePage - 1) * safePageSize };
  if (Object.keys(ROLES).includes(role)) params.role = toBackendRole(role);
  if (status === 'active') params.status = 'active';
  if (status === 'blocked') params.status = 'suspended';

  const search = String(q)
    .replace(/[,%()*]/g, ' ')
    .trim()
    .slice(0, 60);

  if (search) params.q = search;

  let list;
  let branches;
  try {
    [list, branches] = await Promise.all([
      api.get('/api/identity/v1/users', params),
      api.get('/api/branches/v1', { limit: 200 }),
    ]);
  } catch (error) {
    return { error: error.message || 'Could not load administrators.' };
  }

  const branchByCode = Object.fromEntries(
    (branches.items || []).map((b) => [b.branch_code, b]),
  );

  // AdminUserOut nests the branch as { branch_code, name }; there is no flat branch_code field.
  const branchOf = (u) => {
    const code = u.branch?.branch_code || u.branch_code;
    if (!code) return null;
    return { name: u.branch?.name || branchByCode[code]?.name || null, code };
  };

  return {
    rows: (list.items || []).map((u) => ({
      id: String(u.id),
      full_name: u.full_name,
      email: u.email,
      role: fromBackendRole((u.roles || [])[0]),
      is_active: u.status === 'active',
      mfa_enabled: Boolean(u.mfa_enabled),
      created_at: u.created_at,
      // The backend user record has no created_by, so the creator column stays empty.
      creator: null,
      suspension_reason: null,
      branch: branchOf(u),
      lastSignIn: u.last_login_at,
    })),
    total: list.total || 0,
    // Active branches feed the invite form's branch dropdown; the id is the branch code.
    branches: (branches.items || [])
      .filter((b) => b.status === 'active')
      .map((b) => ({
        id: b.branch_code,
        name: b.name,
        code: b.branch_code,
        city: b.city,
        is_active: true,
      }))
      .sort((x, y) => x.name.localeCompare(y.name)),
  };
}

export async function listDashboardAdmins() {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  try {
    const list = await a.api.get('/api/identity/v1/users', { limit: 5 });
    return {
      rows: (list.items || []).map((u) => ({
        id: String(u.id),
        full_name: u.full_name,
        role: fromBackendRole((u.roles || [])[0]),
        is_active: u.status === 'active',
        branch: u.branch
          ? { name: u.branch.name || u.branch.branch_code }
          : null,
      })),
    };
  } catch (error) {
    return { error: error.message || 'Could not load administrators.' };
  }
}
