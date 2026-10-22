import { NextResponse } from 'next/server';
import { audit } from '@/lib/audit';
import { authorize } from '@/lib/auth/session';
import { checkFile } from '@/lib/files';
import { rateLimit } from '@/lib/rateLimit';
import { validateStaff } from '@/lib/validators/salesStaff';

export const runtime = 'nodejs';
const BUCKET = 'staff-documents';
const json = (body, status = 200) => NextResponse.json(body, { status });
const T = (x) => String(x ?? '').trim();

export async function POST(req) {
  const a = await authorize(['merchant_admin']);
  if (a.error) return json({ error: a.error }, a.status);
  const { profile, admin } = a;
  if (!profile.organization_id) return json({ error: 'Your account is not linked to an organization.' }, 403);
  if (!rateLimit(`staff:${profile.id}`, 20)) return json({ error: 'Too many requests. Try again in a minute.' }, 429);
  let fd; try { fd = await req.formData(); } catch { return json({ error: 'Invalid request.' }, 400); }
  const v = {}; ['fullName', 'mobile', 'email', 'joiningDate', 'employmentType', 'territoryId', 'panNumber', 'idProofType', 'address', 'bankAccountNumber', 'ifsc', 'deviceId', 'declaration'].forEach((k) => { v[k] = T(fd.get(k)); });
  v.panNumber = v.panNumber.toUpperCase(); v.ifsc = v.ifsc.toUpperCase();
  const fieldErrors = validateStaff(v);
  // The creator, organization and reporting manager always come from the trusted profile, never from the form.
  const { data: terr } = await admin.from('territories').select('id').eq('id', v.territoryId).eq('organization_id', profile.organization_id).maybeSingle();
  if (!fieldErrors.territoryId && !terr) fieldErrors.territoryId = 'Select a territory from your organization';
  const files = {};
  for (const [field, kind, required] of [['photo', 'photo', false], ['idProof', 'doc', true], ['panDoc', 'doc', false]]) {
    const r = await checkFile(fd.get(field), kind);
    if (r.error) fieldErrors[field] = r.error; else if (r.empty) { if (required) fieldErrors[field] = 'This document is required'; } else files[field] = r;
  }
  if (Object.keys(fieldErrors).length) return json({ fieldErrors }, 422);

  const id = crypto.randomUUID(); const uploaded = [];
  const cleanup = async () => { if (uploaded.length) await admin.storage.from(BUCKET).remove(uploaded); };
  const paths = {};
  for (const [field, f] of Object.entries(files)) {
    const path = `${profile.organization_id}/${id}/${field}.${f.ext}`;
    const { error } = await admin.storage.from(BUCKET).upload(path, f.buffer, { contentType: f.mime, upsert: false });
    if (error) { await cleanup(); return json({ error: 'File upload failed. Nothing was saved.' }, 502); }
    uploaded.push(path); paths[field] = path;
  }
  const now = new Date().toISOString();
  const { data: row, error } = await admin.from('sales_staff').insert({
    id, organization_id: profile.organization_id, full_name: v.fullName, mobile: v.mobile, email: v.email.toLowerCase(),
    joining_date: v.joiningDate, employment_type: v.employmentType || null, reporting_manager_id: profile.id, territory_id: v.territoryId,
    id_proof_type: v.idProofType, id_proof_path: paths.idProof, pan_doc_path: paths.panDoc || null, photo_path: paths.photo || null,
    address: v.address || null, bank_account_last4: v.bankAccountNumber ? v.bankAccountNumber.slice(-4) : null, device_id: v.deviceId || null,
    declaration_accepted: true, declaration_accepted_at: now, declaration_accepted_by: profile.id, declaration_policy_version: process.env.CODE_OF_CONDUCT_VERSION || 'v1',
    status: 'pending', doc_verification_status: 'pending', police_verification_status: 'pending',
    created_by: profile.id, created_by_name: profile.full_name || profile.email, updated_by: profile.id,
  }).select('id, employee_id').single();
  if (error) {
    await cleanup();
    if (error.code === '23505') return json({ fieldErrors: error.message.includes('mobile') ? { mobile: 'This mobile number is already registered' } : { email: 'This email is already registered' } }, 409);
    return json({ error: 'Could not save the staff member. Nothing was saved.' }, 500);
  }
  if (v.panNumber || v.bankAccountNumber) {
    const { error: sErr } = await admin.from('sales_staff_sensitive').insert({ staff_id: id, pan_number: v.panNumber || null, bank_account_number: v.bankAccountNumber || null, ifsc: v.ifsc || null });
    if (sErr) { await admin.from('sales_staff').delete().eq('id', id); await cleanup(); return json({ error: 'Could not save the staff member. Nothing was saved.' }, 500); }
  }
  await audit(admin, profile, 'sales_staff.created', 'sales_staff', id, { employeeId: row.employee_id });
  return json({ ok: true, id, employeeId: row.employee_id }, 201);
}
