'use server';
import { revalidatePath } from 'next/cache';
import { audit } from '@/lib/audit';
import { authorize } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rateLimit';
import { isUuid } from '@/lib/validators/admin';
import { DOC_STATUSES, POLICE_STATUSES, validateStaff } from '@/lib/validators/salesStaff';

const BUCKET = 'staff-documents';
const NOT_FOUND = { error: 'Staff member not found.' };

// Every action loads the row WITH the caller's organization filter, so another organization's ids behave as "not found" (no IDOR).
async function load(ctx, id, cols = 'id, status') {
  if (!isUuid(id) || !ctx.profile.organization_id) return null;
  const { data } = await ctx.admin.from('sales_staff').select(cols).eq('id', id).eq('organization_id', ctx.profile.organization_id).maybeSingle();
  return data;
}
const done = (path = '/merchant-admin/sales-staff') => { revalidatePath(path); return { ok: true }; };

export async function getStaffDetail(id) {
  const ctx = await authorize(['merchant_admin']);
  if (ctx.error) return { error: ctx.error };
  const s = await load(ctx, id, '*, territory:territories(name, state), creator:profiles!sales_staff_created_by_fkey(full_name), approver:profiles!sales_staff_approved_by_fkey(full_name)');
  if (!s) return NOT_FOUND;
  const { data: sens } = await ctx.admin.from('sales_staff_sensitive').select('pan_number').eq('staff_id', id).maybeSingle();
  const pan = sens?.pan_number; // never returned in full
  const sign = async (path) => (path ? (await ctx.admin.storage.from(BUCKET).createSignedUrl(path, 120)).data?.signedUrl || null : null);
  await audit(ctx.admin, ctx.profile, 'sales_staff.viewed_documents', 'sales_staff', id);
  return { staff: { ...s, panMasked: pan ? `${pan.slice(0, 2)}XXXXX${pan.slice(-3)}` : null, bankMasked: s.bank_account_last4 ? `••••${s.bank_account_last4}` : null, urls: { photo: await sign(s.photo_path), idProof: await sign(s.id_proof_path), panDoc: await sign(s.pan_doc_path) } } };
}

export async function setVerification(id, { docStatus, police }) {
  const ctx = await authorize(['merchant_admin']);
  if (ctx.error) return { error: ctx.error };
  const s = await load(ctx, id);
  if (!s) return NOT_FOUND;
  if (s.status === 'rejected') return { error: 'A rejected record cannot be re-verified.' };
  const patch = { updated_by: ctx.profile.id, updated_at: new Date().toISOString() }; const now = patch.updated_at;
  if (docStatus) { if (!DOC_STATUSES.includes(docStatus)) return { error: 'Invalid document status.' }; Object.assign(patch, { doc_verification_status: docStatus, doc_verified_by: ctx.profile.id, doc_verified_at: now }); }
  if (police) { if (!POLICE_STATUSES.includes(police)) return { error: 'Invalid police verification status.' }; Object.assign(patch, { police_verification_status: police, police_verified_by: ctx.profile.id, police_verified_at: now }); }
  const { error } = await ctx.admin.from('sales_staff').update(patch).eq('id', id).eq('organization_id', ctx.profile.organization_id);
  if (error) return { error: 'Could not update verification.' };
  await audit(ctx.admin, ctx.profile, 'sales_staff.verification_changed', 'sales_staff', id, { docStatus: docStatus || null, police: police || null });
  return done();
}

export async function approveStaff(id) {
  const ctx = await authorize(['merchant_admin']);
  if (ctx.error) return { error: ctx.error };
  if (!rateLimit(`approve:${ctx.profile.id}`, 30)) return { error: 'Too many requests.' };
  const now = new Date().toISOString();
  if (!(await load(ctx, id))) return NOT_FOUND;
  // The database CHECK constraint refuses 'active' unless documents are verified and police verification is done / not required.
  const { data, error } = await ctx.admin.from('sales_staff').update({ status: 'active', approved_by: ctx.profile.id, approved_at: now, updated_by: ctx.profile.id, updated_at: now })
    .eq('id', id).eq('organization_id', ctx.profile.organization_id).eq('status', 'pending').select('id');
  if (error?.code === '23514') return { error: 'Document verification and police verification must be complete before approval.' };
  if (error) return { error: 'Could not approve.' };
  if (!data?.length) return { error: 'Only pending records can be approved.' };
  await audit(ctx.admin, ctx.profile, 'sales_staff.approved', 'sales_staff', id);
  return done();
}

export async function rejectStaff(id, reason) {
  const ctx = await authorize(['merchant_admin']);
  if (ctx.error) return { error: ctx.error };
  const why = String(reason || '').trim();
  if (why.length < 5 || why.length > 300) return { error: 'Enter a rejection reason (5-300 characters).' };
  if (!(await load(ctx, id))) return NOT_FOUND;
  const now = new Date().toISOString();
  const { data, error } = await ctx.admin.from('sales_staff').update({ status: 'rejected', rejected_by: ctx.profile.id, rejected_at: now, rejection_reason: why, updated_by: ctx.profile.id, updated_at: now })
    .eq('id', id).eq('organization_id', ctx.profile.organization_id).eq('status', 'pending').select('id');
  if (error || !data?.length) return { error: 'Only pending records can be rejected.' };
  await audit(ctx.admin, ctx.profile, 'sales_staff.rejected', 'sales_staff', id, { reason: why });
  return done();
}

export async function setStaffActive(id, active) { // deactivate / reactivate an approved member
  const ctx = await authorize(['merchant_admin']);
  if (ctx.error) return { error: ctx.error };
  const s = await load(ctx, id, 'id, status, approved_at');
  if (!s || !s.approved_at) return { error: 'Only approved staff can be activated or deactivated.' };
  const { error } = await ctx.admin.from('sales_staff').update({ status: active ? 'active' : 'inactive', updated_by: ctx.profile.id, updated_at: new Date().toISOString() }).eq('id', id).eq('organization_id', ctx.profile.organization_id);
  if (error?.code === '23514') return { error: 'Verification must be complete before the staff member can be active.' };
  if (error) return { error: 'Could not update status.' };
  await audit(ctx.admin, ctx.profile, active ? 'sales_staff.reactivated' : 'sales_staff.deactivated', 'sales_staff', id);
  return done();
}

export async function updateStaff(id, v) {
  const ctx = await authorize(['merchant_admin']);
  if (ctx.error) return { error: ctx.error };
  const fieldErrors = validateStaff(v || {}, { partial: true });
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  if (!(await load(ctx, id))) return NOT_FOUND;
  const { data: terr } = await ctx.admin.from('territories').select('id').eq('id', v.territoryId).eq('organization_id', ctx.profile.organization_id).maybeSingle();
  if (!terr) return { fieldErrors: { territoryId: 'Select a territory from your organization' } };
  const { error } = await ctx.admin.from('sales_staff').update({ full_name: v.fullName.trim(), mobile: v.mobile.trim(), email: v.email.trim().toLowerCase(), territory_id: v.territoryId, device_id: String(v.deviceId || '').trim() || null, address: String(v.address || '').trim() || null, updated_by: ctx.profile.id, updated_at: new Date().toISOString() }).eq('id', id).eq('organization_id', ctx.profile.organization_id);
  if (error?.code === '23505') return { fieldErrors: { mobile: 'Mobile or email is already registered' } };
  if (error) return { error: 'Could not save changes.' };
  await audit(ctx.admin, ctx.profile, 'sales_staff.updated', 'sales_staff', id);
  return done();
}
