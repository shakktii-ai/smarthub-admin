'use server';

import { revalidatePath } from 'next/cache';
import { authorize } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rateLimit';
import {
  MERCHANT_ONBOARDING_STATUSES,
  MERCHANT_STATUSES,
} from '@/config/onboarding';

const PATH = '/api/merchants/v1';

// Only these four reach a bare POST route; the whitelist keeps anything typed into a
// bookmarked URL out of the path.
const STEPS = new Set(['submit', 'review', 'approve', 'activate']);

const explain = (error, fallback) => {
  if (error.status === 404) {
    return 'That merchant no longer exists. Reload the list.';
  }
  // The backend refuses to approve a merchant it cannot route settlements to.
  if (error.code === 'merchant_identifier_required') {
    return 'This merchant has no Zaakpay or custom identifier yet. Open Edit, set one, then approve.';
  }
  if (error.code === 'merchant_onboarding_transition_invalid') {
    return error.message || 'The backend will not allow that step from the current status.';
  }
  return error.message || fallback;
};

const guard = async (scope) => {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  if (!rateLimit(`merchants-${scope}:${a.profile.id}`, 30)) {
    return { error: 'Too many requests. Try again in a minute.' };
  }

  return a;
};

export async function listMerchants({
  q = '',
  status = '',
  onboarding = '',
  page = 1,
  pageSize = 10,
} = {}) {
  const a = await guard('list');

  if (a.error) {
    return { error: a.error };
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 10));

  const params = { limit: safePageSize, offset: (safePage - 1) * safePageSize };

  // The endpoint filters on the stored snake_case value, not on the dashboard label.
  if (MERCHANT_STATUSES[status]) params.status = status;
  if (MERCHANT_ONBOARDING_STATUSES[onboarding]) params.onboarding_status = onboarding;

  const search = String(q ?? '').trim().slice(0, 100);

  if (search) params.q = search;

  try {
    const list = await a.api.get(PATH, params);

    return {
      rows: (list.items || []).map((m) => ({
        id: m.merchant_code,
        name: m.display_name || m.legal_name,
        legal_name: m.legal_name,
        category: m.business_category,
        status: m.status,
        onboarding_status: m.onboarding_status,
        kyc_status: m.kyc_status,
        email: m.email,
        phone: m.phone,
        pan: m.pan,
        gstin: m.gstin,
        identifier: m.zaakpay_identifier || m.custom_identifier || '',
        split_enabled: m.split_enabled,
        approved_at: m.approved_at,
        activated_at: m.activated_at,
        rejected_reason: m.rejected_reason,
        created_at: m.created_at,
        updated_at: m.updated_at,
      })),
      total: list.total || 0,
      page: safePage,
      pageSize: safePageSize,
    };
  } catch (error) {
    return { error: explain(error, 'Could not load the merchants.') };
  }
}

// POST /{code}/approve makes the merchant live and is audited as merchant.approved. It is not
// the same thing as approving the application, which lives on the application screen.
export async function approveMerchant(id) {
  const a = await guard('approve');

  if (a.error) {
    return { error: a.error };
  }

  const code = String(id ?? '').trim();

  if (!code) {
    return { error: 'Invalid merchant.' };
  }

  try {
    await a.api.post(`${PATH}/${encodeURIComponent(code)}/approve`);
  } catch (error) {
    return { error: explain(error, 'Could not approve the merchant.') };
  }

  revalidatePath('/super-admin/merchants');

  return { ok: true };
}

export async function suspendMerchant(id) {
  const a = await guard('suspend');

  if (a.error) {
    return { error: a.error };
  }

  const code = String(id ?? '').trim();

  if (!code) {
    return { error: 'Invalid merchant.' };
  }

  try {
    await a.api.post(`${PATH}/${encodeURIComponent(code)}/suspend`);
  } catch (error) {
    return { error: explain(error, 'Could not suspend the merchant.') };
  }

  revalidatePath('/super-admin/merchants');

  return { ok: true };
}

// The reason is stored on the merchant and shown to the applicant, so it is required here
// rather than optional.
export async function rejectMerchant(id, values = {}) {
  const a = await guard('reject');

  if (a.error) {
    return { error: a.error };
  }

  const code = String(id ?? '').trim();
  const reason = String(values.reason ?? '').trim();

  if (!code) {
    return { error: 'Invalid merchant.' };
  }

  if (reason.length < 8) {
    return { fieldErrors: { reason: 'Say what is wrong. The merchant sees this and has to fix it.' } };
  }

  if (reason.length > 500) {
    return { fieldErrors: { reason: 'Keep the reason under 500 characters.' } };
  }

  try {
    await a.api.post(`${PATH}/${encodeURIComponent(code)}/onboarding/reject`, { reason });
  } catch (error) {
    return { error: explain(error, 'Could not reject the merchant.') };
  }

  revalidatePath('/super-admin/merchants');

  return { ok: true };
}

export async function onboardingStep(id, step) {
  const a = await guard('step');

  if (a.error) {
    return { error: a.error };
  }

  const code = String(id ?? '').trim();

  if (!code) {
    return { error: 'Invalid merchant.' };
  }

  if (!STEPS.has(step)) {
    return { error: 'That onboarding step is not one the backend exposes.' };
  }

  try {
    await a.api.post(`${PATH}/${encodeURIComponent(code)}/onboarding/${step}`);
  } catch (error) {
    return { error: explain(error, 'Could not move the onboarding forward.') };
  }

  revalidatePath('/super-admin/merchants');

  return { ok: true };
}
