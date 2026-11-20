'use server';

import { authorize } from '@/lib/auth/session';

const t = (x) => String(x || '').trim();
const page = (x) => Math.max(1, Number(x) || 1);
const size = (x) => Math.min(100, Math.max(1, Number(x) || 20));

export async function listMandateDebits({ q = '', status = '', page: p = 1, pageSize = 20 } = {}) {
  const a = await authorize(['super_admin']);
  if (a.error) return { error: a.error };

  const params = { page: page(p), pageSize: size(pageSize) };
  if (t(q)) params.q = t(q);
  if (['success', 'pending', 'failed', 'created', 'notified'].includes(status)) {
    params.status = status;
  }

  try {
    const data = await a.api.get('/api/super-admin/v1/mandate-debits', params);
    return { data };
  } catch (error) {
    return { error: error.message || 'Could not load mandate debits.' };
  }
}

export async function listRefunds({ q = '', status = '', page: p = 1, pageSize = 20 } = {}) {
  const a = await authorize(['super_admin']);
  if (a.error) return { error: a.error };

  const params = { page: page(p), pageSize: size(pageSize) };
  if (t(q)) params.q = t(q);
  if (['pending', 'success', 'failed'].includes(status)) {
    params.status = status;
  }

  try {
    const data = await a.api.get('/api/super-admin/v1/refunds', params);
    return { data };
  } catch (error) {
    return { error: error.message || 'Could not load refunds.' };
  }
}

export async function refundMandateDebit({ orderId, amountPaise, reason }) {
  const a = await authorize(['super_admin']);
  if (a.error) return { error: a.error };

  const id = t(orderId);
  if (!id) return { error: 'Missing order id.' };

  const body = {};
  if (amountPaise != null && Number(amountPaise) > 0) {
    body.amount_paise = Math.round(Number(amountPaise));
  }
  if (t(reason)) body.reason = t(reason).slice(0, 120);

  try {
    const data = await a.api.post(
      `/api/super-admin/v1/mandate-debits/${encodeURIComponent(id)}/refund`,
      body,
      undefined,
      { 'Idempotency-Key': crypto.randomUUID() },
    );
    return { ok: true, data };
  } catch (error) {
    return { error: error.message || 'Could not create the refund.' };
  }
}
