
'use server';

import { revalidatePath } from 'next/cache';
import { ROLES } from '@/config/auth';
import { audit } from '@/lib/audit';
import { authorize } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rateLimit';
import { isUuid, validateAdmin } from '@/lib/validators/admin';

const t = (x) => String(x || '').trim() || null;

const BRANCH_REQUIRED_ROLES = [
  'merchant_admin',
  'collection_admin',
];

export async function inviteAdmin(values) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  const { profile, admin } = a;

  if (!rateLimit(`invite:${profile.id}`, 10)) {
    return {
      error: 'Too many requests. Try again in a minute.',
    };
  }

  const fieldErrors = validateAdmin(values || {});

  if (Object.keys(fieldErrors).length) {
    return { fieldErrors };
  }

  const email = String(values.email || '').trim().toLowerCase();
  const fullName = String(values.fullName || '').trim();

  // Prevent duplicate administrator profiles.
  const { data: dup, error: dupError } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (dupError) {
    console.error('Duplicate email lookup failed:', dupError.message);
    return { error: 'Could not verify the email address. Please try again.' };
  }

  if (dup) {
    return {
      fieldErrors: {
        email: 'An administrator with this email already exists.',
      },
    };
  }

  let selectedBranch = null;
  let organizationId = null;

  // Branch is mandatory for Merchant Admin and Collection Admin.
  if (BRANCH_REQUIRED_ROLES.includes(values.role)) {
    if (!isUuid(values.branchId)) {
      return {
        fieldErrors: {
          branchId: 'Please select a valid branch.',
        },
      };
    }

    const { data: branch, error: branchError } = await admin
      .from('branches')
      .select('id, name, is_active')
      .eq('id', values.branchId)
      .eq('is_active', true)
      .maybeSingle();

    if (branchError || !branch) {
      return {
        fieldErrors: {
          branchId: 'Selected branch is unavailable or inactive.',
        },
      };
    }

    selectedBranch = branch;

    // Keep the existing SmartHub Pay organization association.
    const { data: org, error: orgError } = await admin
      .from('organizations')
      .select('id')
      .eq('name', 'SmartHub Pay')
      .maybeSingle();

    if (orgError || !org) {
      console.error('Organization lookup failed:', orgError?.message);

      return {
        error: 'SmartHub Pay organization was not found.',
      };
    }

    organizationId = org.id;
  }

 
  // Validate the password on the server.
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

  // Create the Auth account directly. This does not send an invitation email.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  });

  if (error || !data?.user) {
    console.error('Admin account creation failed:', error?.message);

    return {
      error:
        'Could not create the account. Check the email and password requirements.',
    };
  }


  // Save the trusted profile fields.
  // Employee ID is intentionally not accepted from the form.
  const { error: profileError } = await admin
    .from('profiles')
    .insert({
      id: data.user.id,
      email,
      full_name: fullName,
      role: values.role,
      is_active: true,
      mobile: t(values.mobile),

      organization_id: organizationId,
      branch_id: selectedBranch?.id || null,

      department: null,
      region: null,

      reporting_manager_id: isUuid(values.reportingManagerId)
        ? values.reportingManagerId
        : null,

      created_by: profile.id,
    });

  if (profileError) {
    console.error('Profile creation failed:', profileError.message);

    // Compensate for the failed profile creation.
    await admin.auth.admin.deleteUser(data.user.id);

    return {
      error: 'Could not create the administrator. Nothing was saved.',
    };
  }

  await audit(
    admin,
    profile,
    'admin.invited',
    'profile',
    data.user.id,
    {
      role: values.role,
      branchId: selectedBranch?.id || null,
    }
  );

  revalidatePath('/super-admin/users');

  return { ok: true };
}

export async function setAdminAccess(id, active, reason) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  const { profile, admin } = a;

  if (!isUuid(id)) {
    return { error: 'Invalid administrator.' };
  }

  if (id === profile.id) {
    return { error: 'You cannot change your own access.' };
  }

  const note = String(reason || '').trim().slice(0, 300);

  const { data: target, error: targetError } = await admin
    .from('profiles')
    .select('id, role, is_active')
    .eq('id', id)
    .maybeSingle();

  if (targetError || !target) {
    return { error: 'Administrator not found.' };
  }

  if (target.role === 'super_admin') {
    return {
      error: 'Super Admin access cannot be changed here.',
    };
  }

  const { error } = await admin
    .from('profiles')
    .update({
      is_active: Boolean(active),
      suspension_reason: active ? null : note || null,
      suspended_at: active ? null : new Date().toISOString(),
      suspended_by: active ? null : profile.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Profile access update failed:', error.message);
    return { error: 'Could not update access.' };
  }

  // Profile status remains the authoritative application-level access check.
  const { error: banErr } = await admin.auth.admin.updateUserById(id, {
    ban_duration: active ? 'none' : '876000h',
  });

  await audit(
    admin,
    profile,
    active ? 'admin.reactivated' : 'admin.suspended',
    'profile',
    id,
    {
      reason: note || null,
      banApplied: !banErr,
    }
  );

  revalidatePath('/super-admin/users');

  return {
    ok: true,
    warning: banErr
      ? 'Access is blocked, but the sign-in ban could not be applied.'
      : undefined,
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

  const { admin } = a;

  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(
    100,
    Math.max(1, Number(pageSize) || 10)
  );

  let query = admin
    .from('profiles')
    .select(
      `
        id,
        full_name,
        email,
        role,
        is_active,
        suspension_reason,
        created_at,
        created_by,
        branch_id,
        organization:organizations(name),
        branch:branches(name, code)
      `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false });

  if (Object.keys(ROLES).includes(role)) {
    query = query.eq('role', role);
  }

  if (status === 'active') {
    query = query.eq('is_active', true);
  }

  if (status === 'blocked') {
    query = query.eq('is_active', false);
  }

  const search = String(q)
    .replace(/[,%()*]/g, ' ')
    .trim()
    .slice(0, 60);

  if (search) {
    query = query.or(
      `full_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  const { data, count, error } = await query.range(
    (safePage - 1) * safePageSize,
    safePage * safePageSize - 1
  );

  if (error) {
    console.error('listAdmins query error:', error.message);

    return {
      error: `Could not load administrators: ${error.message}`,
    };
  }

  const rows = data || [];

  // Resolve administrator creators.
  const creatorIds = [
    ...new Set(rows.map((r) => r.created_by).filter(Boolean)),
  ];

  let creatorNames = {};

  if (creatorIds.length) {
    const { data: creators, error: creatorError } = await admin
      .from('profiles')
      .select('id, full_name')
      .in('id', creatorIds);

    if (creatorError) {
      console.error('Creator lookup error:', creatorError.message);

      return {
        error: `Could not load creator names: ${creatorError.message}`,
      };
    }

    creatorNames = Object.fromEntries(
      (creators || []).map((c) => [c.id, c.full_name])
    );
  }

  // Resolve last sign-in timestamps.
  const { data: users, error: usersError } =
    await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

  if (usersError) {
    console.error('Auth users lookup error:', usersError.message);
  }

  const last = Object.fromEntries(
    (users?.users || []).map((u) => [u.id, u.last_sign_in_at])
  );

  // Keep organizations available for any existing UI that still uses them.
  const { data: orgs, error: orgError } = await admin
    .from('organizations')
    .select('id, name')
    .order('name');

  if (orgError) {
    console.error('Organizations lookup error:', orgError.message);

    return {
      error: `Could not load organizations: ${orgError.message}`,
    };
  }

  // Active managers for the reporting manager dropdown.
  const { data: managers, error: managersError } = await admin
    .from('profiles')
    .select('id, full_name')
    .eq('is_active', true)
    .order('full_name');

  if (managersError) {
    console.error('Managers lookup error:', managersError.message);

    return {
      error: `Could not load managers: ${managersError.message}`,
    };
  }

  // Active branches for the branch dropdown.
  const { data: branches, error: branchesError } = await admin
    .from('branches')
    .select('id, name, code, city, is_active')
    .eq('is_active', true)
    .order('name');

  if (branchesError) {
    console.error('Branches lookup error:', branchesError.message);

    return { error: 'Could not load branches.' };
  }

  return {
    rows: rows.map((r) => ({
      ...r,
      creator: r.created_by
        ? { full_name: creatorNames[r.created_by] || null }
        : null,
      lastSignIn: last[r.id] || null,
    })),
    total: count || 0,
    orgs: orgs || [],
    managers: managers || [],
    branches: branches || [],
  };
}

export async function listDashboardAdmins() {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  const { data, error } = await a.admin
    .from('profiles')
    .select('id, full_name, role, is_active, branch:branches(name)')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Dashboard administrators query error:', error.message);
    return { error: 'Could not load administrators.' };
  }

  return { rows: data || [] };
}
