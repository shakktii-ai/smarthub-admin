'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, ErrorState, Spinner, cx } from '@/components/ui';
import { FormModal } from '@/components/ui/blocks';
import { useApp } from '@/components/ui/AppContext';
import { exportCsv } from '@/lib/csv';
import { inr } from '@/lib/format';
import { MERCHANT_ONBOARDING_NEXT } from '@/config/onboarding';
import { applicationForMerchant, getMerchant, merchantOnboardingStep, rejectMerchant, setMerchantStatus, updateMerchant } from '@/services';

const TABS = ['Overview', 'Business Details', 'KYC & Documents', 'Bank Verification', 'Outlets'];
const ONBOARDING_STEPS = ['lead', 'application_submitted', 'under_review', 'approved', 'active'];
const Row = ({ k, v }) => <div className="flex justify-between gap-4 py-1.5 text-sm"><span className="text-slate-500">{k}</span><span className="text-right font-medium">{v || '-'}</span></div>;
const Table = ({ head, rows, onRowClick }) => <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-slate-500"><tr>{head.map((h) => <th key={h} className="py-1 pr-4">{h}</th>)}</tr></thead><tbody>{rows.length ? rows.map((r, i) => <tr key={i} className={cx('border-t border-slate-100', onRowClick && 'cursor-pointer')} onClick={() => onRowClick?.(r, i)}>{r.map((c, j) => <td key={j} className="py-2 pr-4">{c}</td>)}</tr>) : <tr><td className="py-3 text-slate-500" colSpan={head.length}>Nothing on the backend yet.</td></tr>}</tbody></table></div>;
const orDash = (v) => (v === null || v === undefined || v === '' ? '-' : v);
const phone = (v) => (String(v || '').length === 10 ? `+91 ${String(v).replace(/(\d{5})(\d{5})/, '$1 $2')}` : orDash(v));

// Every screen that opens a merchant lives in a different dashboard, so the paths travel in as
// props instead of being hard-coded to one prefix.
export default function MerchantDetail({
  id,
  backHref = '/merchant-admin/merchants',
  applicationBase = '/merchant-admin/merchants/onboarding',
  transactionsHref = null,
  auditPath = null,
}) {
  const { toast } = useApp();
  const [m, setM] = useState(null); const [err, setErr] = useState(false); const [tab, setTab] = useState('Overview'); const [dlg, setDlg] = useState(null); const [busy, setBusy] = useState(false); const [reason, setReason] = useState(''); const [appRef, setAppRef] = useState('');
  const load = useCallback(() => { setErr(false); getMerchant(id).then(setM).catch(() => setErr(true)); }, [id]);
  useEffect(() => { load(); }, [load]);
  const run = async (fn, msg) => { setBusy(true); try { setM(await fn()); toast(msg); setDlg(null); } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); } };
  useEffect(() => {
    // Only an approved merchant has paperwork behind it; the lookup is the merchant_code filter
    // the applications endpoint exposes, not a guess from the business name.
    setAppRef('');
    applicationForMerchant(id).then(setAppRef).catch(() => setAppRef(''));
  }, [id]);
  if (err) return <ErrorState onRetry={load} />;
  if (!m) return <Spinner />;
  const name = m.name || m.legalName;
  const onboarding = String(m.raw?.onboarding_status || '').toLowerCase();
  const stepIndex = ONBOARDING_STEPS.indexOf(onboarding);
  const rejected = onboarding === 'rejected';
  const steps = ['Application Submitted', 'Document Review', 'Bank Verification', 'Final Review', rejected ? 'Rejected' : 'Active'];
  const done = rejected ? 4 : onboarding === 'active' ? 5 : onboarding === 'approved' ? 4 : stepIndex >= 3 ? 3 : stepIndex >= 1 ? 1 : 0;
  const verifiedCount = m.documents.filter((d) => d.status === 'Valid').length;
  const identifier = m.raw?.zaakpay_identifier || m.raw?.custom_identifier || '';
  const nextSteps = MERCHANT_ONBOARDING_NEXT[onboarding] || [];
  const canSuspend = m.status === 'Active';
  const canActivate = m.status === 'Suspended' || m.status === 'Draft' || m.status === 'Pending';
  const kycReport = () => { exportCsv(`${m.id}-kyc-report.csv`, [{ key: 'name', label: 'Check' }, { key: 'status', label: 'Status' }, { key: 'remarks', label: 'Remarks' }], m.documents); toast('KYC report downloaded'); };
  const primary = m.outlets[0] || null;
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><Link href={backHref} className="text-sm text-brand">← All Merchants</Link><h1 className="text-2xl font-bold">{m.id} - {name} <Badge value={m.status} /></h1><p className="text-sm text-slate-600">{orDash(m.mcc)}{m.city ? ` · ${m.city}` : ''} · Created on {m.submittedOn}</p></div>
        <div className="flex flex-wrap gap-2">{transactionsHref && <Link href={transactionsHref}><Button variant="outline">View Transactions</Button></Link>}{nextSteps.map(([step, label]) => <Button key={step} variant={step === 'reject' ? 'danger' : 'outline'} disabled={busy} onClick={() => (step === 'reject' ? setDlg('reject') : run(() => merchantOnboardingStep(id, step), label))}>{label}</Button>)}{canSuspend && <Button variant="outline" disabled={busy} onClick={() => setDlg('suspend')}>Suspend</Button>}{canActivate && <Button variant="outline" disabled={busy} onClick={() => setDlg('activate')}>Activate</Button>}<Button onClick={() => setDlg('edit')}>Edit</Button></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="space-y-4">
          <Card title="Onboarding Progress"><ol className="space-y-3">{steps.map((s, i) => <li key={s} className="flex items-center gap-2 text-sm">{i < done ? <CheckCircle2 size={18} className={rejected && i === 4 ? 'text-red-500' : 'text-emerald-500'} aria-hidden /> : <Circle size={18} className="text-slate-300" aria-hidden />}<span className={i < done ? 'font-medium' : 'text-slate-500'}>{s}</span></li>)}</ol><p className="mt-3 text-xs text-slate-500">Derived from the merchant&apos;s onboarding status. The backend has no per-step review trail.</p></Card>
          <Card title="Where this came from">
            {appRef ? <p className="text-sm">Approved from application <Link href={`${applicationBase}/${encodeURIComponent(appRef)}`} className="font-mono text-brand">{appRef}</Link> — open it to re-read the documents and the bank proof.</p> : <p className="text-sm text-slate-600">No application is filed under this code, so this merchant was created by an operator rather than through the app. Documents are reviewed on the application screen.</p>}
            {auditPath && <Link href={`${auditPath}?resource=merchant&resourceId=${encodeURIComponent(m.id)}`} className="mt-3 inline-block text-sm text-brand">Decision trail for {m.id}</Link>}
          </Card>
        </div>
        <div className="space-y-4">
          <div role="tablist" className="flex flex-wrap gap-4 border-b border-slate-200">{TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cx('-mb-px border-b-2 px-1 pb-2 text-sm font-medium', tab === t ? 'border-brand text-brand' : 'border-transparent text-slate-600')}>{t}</button>)}</div>
          {tab === 'Overview' && (
            <div className="grid gap-4 xl:grid-cols-3">
              <Card title="Merchant Information" className="xl:col-span-2"><Row k="Trade Name" v={m.name} /><Row k="Legal Name" v={m.legalName} /><Row k="Entity Type" v={m.entityType} /><Row k="Category (MCC)" v={m.mcc} /><Row k="Mobile" v={phone(m.mobile)} /><Row k="Email" v={m.email} /><Row k="Estimated Monthly Turnover" v={m.turnover === null ? null : inr(m.turnover)} /><Row k="Average Ticket" v={m.avgTicket === null ? null : inr(m.avgTicket)} /><Row k="Outlet City" v={primary?.city} /></Card>
              <div className="space-y-4">
                <Card title="Status Summary"><Row k="Onboarding Status" v={<Badge value={m.onboardingStatus} />} /><Row k="KYC Status" v={<Badge value={m.kycStatus} />} /><Row k="Bank Verification" v={<Badge value={m.bankStatus} />} /><Row k="KYC Checks Passed" v={`${verifiedCount} of ${m.documents.length}`} /><Row k="Merchant Status" v={<Badge value={m.status} />} /><Row k="Settlement Identifier" v={identifier || <span className="text-orange-600">missing — approval is refused</span>} />{m.raw?.rejected_reason && <Row k="Rejection Reason" v={m.raw.rejected_reason} />}</Card>
                <Card title="Quick Actions"><div className="space-y-2"><Button variant="outline" className="w-full" onClick={() => setTab('KYC & Documents')}>View All Checks</Button><Button variant="outline" className="w-full" onClick={kycReport}>Download KYC Report</Button><Button variant="outline" className="w-full" onClick={() => setDlg('edit')}>Edit Merchant</Button>{canSuspend && <Button variant="outline" className="w-full" onClick={() => setDlg('suspend')}>Suspend Merchant</Button>}{canActivate && <Button variant="outline" className="w-full" onClick={() => setDlg('activate')}>Activate Merchant</Button>}{nextSteps.some(([s]) => s === 'reject') && <Button variant="danger" className="w-full" onClick={() => setDlg('reject')}>Reject Application</Button>}</div></Card>
              </div>
            </div>)}
          {tab === 'Business Details' && <Card title="Business Information"><Row k="Legal Name" v={m.legalName} /><Row k="Trade Name" v={m.name} /><Row k="Entity Type" v={m.entityType} /><Row k="Product Type" v={m.raw?.product_type} /><Row k="PAN" v={m.pan} /><Row k="GSTIN" v={m.gstin} /><Row k="Category (MCC)" v={m.mcc} /><Row k="Expected Monthly Turnover" v={m.turnover === null ? null : inr(m.turnover)} /><Row k="Merchant Code" v={m.id} /><Row k="Zaakpay Identifier" v={m.raw?.zaakpay_identifier} /><Row k="Custom Identifier" v={m.raw?.custom_identifier} /><Row k="Master Merchant" v={m.raw?.is_master ? 'Yes' : 'No'} /><Row k="Split Enabled" v={m.raw?.split_enabled ? 'Yes' : 'No'} /><Row k="Branch ID" v={m.branchCode} /></Card>}
          {tab === 'KYC & Documents' && <>
            <Card title="KYC Checks"><Table head={['Check', 'Status', 'Remarks']} rows={m.documents.map((d) => [d.name, <Badge key={d.name} value={d.status} />, d.remarks])} /></Card>
            <p className="text-xs text-slate-500">These are the four provider checks the backend records on a merchant KYC profile. The uploaded files themselves live on the application{appRef ? ', and can be opened and verified there' : ''}; a merchant row has no documents attached to it.</p>
          </>}
          {tab === 'Bank Verification' && <Card title="Settlement Bank Verification"><Row k="Bank Check" v={<Badge value={m.bankStatus} />} /><p className="mt-2 text-xs text-slate-500">The KYC profile stores only the masked account and the verification flag. Run the ₹1 penny drop from the onboarding application screen, where the account number and IFSC are entered.</p>{m.outlets.length > 0 && <div className="mt-3"><Row k="Outlet City" v={primary?.city} /></div>}</Card>}
          {tab === 'Outlets' && <Card title="Outlets"><Table head={['Outlet', 'Name', 'Address', 'City', 'State', 'PIN', 'Status']} rows={m.outlets.map((o) => [o.id, o.name, o.address, o.city, o.state, o.pincode, <Badge key={o.id} value={o.status} />])} /></Card>}
        </div>
      </div>
      {dlg === 'suspend' && <ConfirmDialog title="Suspend merchant" message={`POST /api/merchants/v1/${m.id}/suspend marks this merchant Suspended on the backend. It stops taking new money immediately and can be approved again later.`} busy={busy} onConfirm={() => run(() => setMerchantStatus(id, 'Suspended'), 'Merchant suspended')} onCancel={() => setDlg(null)} />}
      {dlg === 'activate' && <ConfirmDialog title="Activate merchant" message={`POST /api/merchants/v1/${m.id}/approve sets the merchant Active. The backend refuses it until a Zaakpay or custom identifier is saved on the profile.`} busy={busy} onConfirm={() => run(() => setMerchantStatus(id, 'Active'), 'Merchant activated')} onCancel={() => setDlg(null)} />}
      {dlg === 'reject' && <Card className="max-w-lg"><p className="text-sm">Rejecting writes the reason onto the merchant and moves both the onboarding and the merchant status to Rejected. The merchant sees this text in its app.</p><label className="mt-3 block text-sm font-medium">Reason *<textarea className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm font-normal" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></label><div className="mt-3 flex justify-end gap-2"><Button variant="outline" onClick={() => setDlg(null)}>Cancel</Button><Button variant="danger" disabled={busy || reason.trim().length < 8} onClick={() => run(() => rejectMerchant(id, reason), 'Merchant rejected')}>Reject Merchant</Button></div></Card>}
      {dlg === 'edit' && <FormModal title="Edit Merchant" initial={{ name: m.name || '', legalName: m.legalName || '', mobile: String(m.mobile || '').replace(/\D/g, '').slice(-10), email: m.email || '', category: m.mcc || '', pan: m.pan || '', gstin: m.gstin || '', turnover: m.turnover ?? '', zaakpay: m.raw?.zaakpay_identifier || '', custom: m.raw?.custom_identifier || '' }} fields={[{ name: 'legalName', label: 'Legal Name', required: true }, { name: 'name', label: 'Trade Name' }, { name: 'mobile', label: 'Mobile', required: true, pattern: /^\d{6,15}$/, message: 'Enter 6-15 digits' }, { name: 'email', label: 'Email', pattern: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' }, { name: 'category', label: 'Category (MCC)' }, { name: 'pan', label: 'PAN', pattern: /^[A-Z]{5}[0-9]{4}[A-Z]$/i, message: 'Enter a 10-character PAN', upper: true }, { name: 'gstin', label: 'GSTIN', pattern: /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]\d[A-Z0-9]$/i, message: 'Enter a 15-character GSTIN', upper: true }, { name: 'turnover', label: 'Expected Monthly Turnover (₹)', pattern: /^\d+(\.\d{1,2})?$/, message: 'Enter an amount' }, { name: 'zaakpay', label: 'Zaakpay Identifier', pattern: /^[A-Za-z0-9]{1,40}$/, message: 'Letters and digits only, up to 40 characters.', hint: 'Without this or a custom identifier the backend refuses to approve the merchant.' }, { name: 'custom', label: 'Custom Identifier', pattern: /^[A-Za-z0-9]{1,40}$/, message: 'Letters and digits only, up to 40 characters.', hint: 'An internal reference if the merchant is not on Zaakpay yet.' }]} onClose={() => setDlg(null)} onSubmit={(v) => run(() => updateMerchant(id, { ...v, mobile: `+91 ${v.mobile}`, zaakpay_identifier: v.zaakpay || '', custom_identifier: v.custom || '' }), 'Merchant updated')} />}
    </>
  );
}
