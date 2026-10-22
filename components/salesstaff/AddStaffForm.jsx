'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, FileText } from 'lucide-react';
import { Button, Card, Field, inputCls } from '@/components/ui';
import { useApp } from '@/components/ui/AppContext';
import { FILE_RULES, clientFileError } from '@/lib/files';
import { EMPLOYMENT_TYPES, ID_PROOF_TYPES, validateStaff } from '@/lib/validators/salesStaff';

const Section = ({ n, title, hint, children }) => <section className="border-t border-slate-200 pt-4"><h2 className="mb-3 flex items-center gap-2 text-base font-semibold"><span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-xs text-white">{n}</span>{title}{hint && <span className="text-sm font-normal text-slate-500">{hint}</span>}</h2>{children}</section>;

function FileBox({ label, kind, file, onChange, error, required }) {
  const [msg, setMsg] = useState('');
  const pick = (e) => { const f = e.target.files[0]; const m = clientFileError(f, kind); setMsg(m); onChange(m ? null : f || null); if (m) e.target.value = ''; };
  return (
    <Field label={`${label}${required ? ' *' : ''}`} error={error || msg}>
      <span className="mt-1 flex items-center gap-2 rounded-lg border border-dashed border-blue-300 bg-blue-50/40 p-3 text-sm font-normal"><FileText size={18} className="text-brand" aria-hidden /><input type="file" accept={FILE_RULES[kind].types.join(',')} onChange={pick} className="w-full text-xs" /></span>
      <span className="text-xs font-normal text-slate-500">{file ? file.name : FILE_RULES[kind].label}</span>
    </Field>
  );
}

export default function AddStaffForm({ managerName, territories }) {
  const router = useRouter(); const { toast } = useApp();
  const [v, setV] = useState({ joiningDate: new Date().toISOString().slice(0, 10), idProofType: ID_PROOF_TYPES[0], declaration: false });
  const [files, setFiles] = useState({}); const [errs, setErrs] = useState({}); const [busy, setBusy] = useState(false); const [preview, setPreview] = useState('');
  const set = (k, val) => setV((p) => ({ ...p, [k]: val }));
  const text = (k, extra = {}) => <input className={inputCls} value={v[k] || ''} onChange={(e) => set(k, extra.upper ? e.target.value.toUpperCase() : e.target.value)} {...extra.props} />;
  const setFile = (k) => (f) => setFiles((p) => ({ ...p, [k]: f }));
  const submit = async (e) => {
    e.preventDefault();
    const er = validateStaff({ ...v, territoryId: v.territoryId });
    if (!files.idProof) er.idProof = 'This document is required';
    setErrs(er); if (Object.keys(er).length) { toast('Please fix the highlighted fields', 'error'); return; }
    setBusy(true);
    const fd = new FormData(); Object.entries(v).forEach(([k, val]) => fd.append(k, String(val ?? ''))); Object.entries(files).forEach(([k, f]) => f && fd.append(k, f));
    try {
      const res = await fetch('/api/sales-staff', { method: 'POST', body: fd }); const body = await res.json().catch(() => ({}));
      if (res.ok && body.ok) { toast(`Sales staff added (${body.employeeId}). Pending approval.`); router.push('/merchant-admin/sales-staff'); router.refresh(); return; }
      setErrs(body.fieldErrors || {}); toast(body.error || 'Please fix the highlighted fields', 'error');
    } catch { toast('Network error. Nothing was saved.', 'error'); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div><Link href="/merchant-admin/sales-staff" className="flex items-center gap-1 text-sm text-brand"><ArrowLeft size={14} aria-hidden />Back to Sales Staff</Link><h1 className="text-2xl font-bold">Add Sales Staff</h1><p className="text-sm text-slate-600">Add a new sales staff member to your team. They help with merchant onboarding and field operations.</p></div>
      <Card className="space-y-5">
        <Section n={1} title="Basic Information">
          <div className="grid gap-x-6 md:grid-cols-[1fr_220px]">
            <div><Field label="Full Name *" error={errs.fullName}>{text('fullName')}</Field><Field label="Mobile Number *" error={errs.mobile}>{text('mobile', { props: { inputMode: 'numeric', maxLength: 10 } })}</Field><Field label="Email Address *" error={errs.email}>{text('email', { props: { type: 'email' } })}</Field></div>
            <div><FileBox label="Photo (Optional)" kind="photo" file={files.photo} error={errs.photo} onChange={(f) => { setFile('photo')(f); setPreview(f ? URL.createObjectURL(f) : ''); }} />{preview && <img src={preview} alt="Selected photo preview" className="h-24 w-24 rounded-lg object-cover" />}{files.photo && <button type="button" className="mt-1 text-xs text-red-600" onClick={() => { setFile('photo')(null); setPreview(''); }}>Remove photo</button>}</div>
          </div>
        </Section>
        <Section n={2} title="Employment Details">
          <div className="grid gap-x-6 md:grid-cols-3">
            <Field label="Employee ID"><input className={`${inputCls} bg-slate-100`} value="Generated on save" disabled readOnly /><span className="text-xs font-normal text-slate-500">Auto-generated by the system</span></Field>
            <Field label="Joining Date *" error={errs.joiningDate}><input type="date" className={inputCls} value={v.joiningDate} onChange={(e) => set('joiningDate', e.target.value)} /></Field>
            <Field label="Reporting Manager"><input className={`${inputCls} bg-slate-100`} value={`${managerName} (Merchant Admin)`} disabled readOnly /></Field>
            <Field label="Employment Type" error={errs.employmentType}><select className={inputCls} value={v.employmentType || ''} onChange={(e) => set('employmentType', e.target.value)}><option value="">Select…</option>{EMPLOYMENT_TYPES.map((o) => <option key={o}>{o}</option>)}</select></Field>
          </div>
        </Section>
        <Section n={3} title="Territory Assignment">
          <Field label="Assigned Territory *" error={errs.territoryId}><select className={inputCls} value={v.territoryId || ''} onChange={(e) => set('territoryId', e.target.value)}><option value="">Select…</option>{territories.map((t) => <option key={t.id} value={t.id}>{t.name}{t.state ? `, ${t.state}` : ''}</option>)}</select></Field>
          {territories.length === 0 && <p className="text-xs text-amber-700">No territories are set up for your organization yet. Ask a Super Admin to add them.</p>}
        </Section>
        <Section n={4} title="Identity & Documents">
          <div className="grid gap-x-6 md:grid-cols-2">
            <Field label="PAN Number (Optional)" error={errs.panNumber}>{text('panNumber', { upper: true, props: { maxLength: 10 } })}</Field>
            <Field label="ID Proof Type *" error={errs.idProofType}><select className={inputCls} value={v.idProofType} onChange={(e) => set('idProofType', e.target.value)}>{ID_PROOF_TYPES.map((o) => <option key={o}>{o}</option>)}</select></Field>
            <FileBox label="PAN Document (Optional)" kind="doc" file={files.panDoc} error={errs.panDoc} onChange={setFile('panDoc')} />
            <FileBox label="ID Proof Document" kind="doc" required file={files.idProof} error={errs.idProof} onChange={setFile('idProof')} />
          </div>
        </Section>
        <Section n={5} title="Address" hint="(Optional)"><Field label="" error={errs.address}><textarea className={inputCls} rows={3} maxLength={300} value={v.address || ''} onChange={(e) => set('address', e.target.value)} /></Field></Section>
        <Section n={6} title="Bank Details" hint="(for Incentives) (Optional)">
          <div className="grid gap-x-6 md:grid-cols-2"><Field label="Account Number" error={errs.bankAccountNumber}>{text('bankAccountNumber', { props: { inputMode: 'numeric', autoComplete: 'off', maxLength: 18 } })}</Field><Field label="IFSC Code" error={errs.ifsc}>{text('ifsc', { upper: true, props: { maxLength: 11 } })}</Field></div>
          <p className="text-xs text-slate-500">Saved details are not verified automatically. Only the last 4 digits are shown after saving.</p>
        </Section>
        <Section n={7} title="Device Information" hint="(Optional)"><Field label="Device ID" error={errs.deviceId}>{text('deviceId')}</Field></Section>
        <Section n={8} title="Declaration">
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={v.declaration} onChange={(e) => set('declaration', e.target.checked)} />I confirm the information is accurate and I have checked the required documents and the Code of Conduct requirements for this staff member.</label>
          {errs.declaration && <p role="alert" className="mt-1 text-xs text-red-600">{errs.declaration}</p>}
        </Section>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => router.push('/merchant-admin/sales-staff')}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit'}</Button></div>
      </Card>
    </form>
  );
}
