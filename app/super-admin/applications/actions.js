'use server';

import { authorize } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rateLimit';
import { APPLICATION_STATUSES } from '@/config/onboarding';

const PATH = '/api/merchant-admin/v1/onboarding/applications';

// The queue is read-only here; the review itself lives on the application screen, which posts
// the document, bank and decision transitions straight to the merchant-admin onboarding API.
export async function listApplications({
  q = '',
  status = '',
  page = 1,
  pageSize = 10,
} = {}) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  if (!rateLimit(`applications-list:${a.profile.id}`, 60)) {
    return { error: 'Too many requests. Try again in a minute.' };
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 10));

  const params = { limit: safePageSize, offset: (safePage - 1) * safePageSize };

  // The endpoint filters on the stored snake_case value, not on the dashboard label.
  if (APPLICATION_STATUSES[status]) params.status = status;

  const search = String(q ?? '').trim().slice(0, 100);

  if (search) params.q = search;

  try {
    const list = await a.api.get(PATH, params);

    return {
      rows: (list.items || []).map((x) => ({
        ref: x.application_ref,
        business: x.business_name || x.owner_name || x.phone,
        owner: x.owner_name,
        phone: x.phone,
        email: x.email,
        city: x.city,
        category: x.business_category,
        pan: x.pan_masked,
        pan_verified: x.pan_verified,
        bank_verified: x.bank_verified,
        status: x.status,
        merchant_code: x.merchant_code,
        rejection_reason: x.rejection_reason,
        submitted_at: x.submitted_at,
        reviewed_at: x.reviewed_at,
        created_at: x.created_at,
      })),
      total: list.total || 0,
      page: safePage,
      pageSize: safePageSize,
    };
  } catch (error) {
    return { error: error.message || 'Could not load the applications.' };
  }
}
