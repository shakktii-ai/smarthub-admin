'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, ErrorState, Spinner, cx } from '@/components/ui';
import { FormModal } from '@/components/ui/blocks';
import { useApp } from '@/components/ui/AppContext';
import { exportCsv } from '@/lib/csv';
import { getMerchant, updateMerchant } from '@/services';

const B = '/merchant-admin';
const TABS = ['Overview', 'Business Details', 'KYC & Documents', 'Bank Verification', 'Declarations & E-sign', 'Beneficial Owners', 'Review History'];
const DECL = ['Terms & Conditions', 'Privacy Notice', 'Refund Policy', 'Merchant Agreement', 'KYC Declaration', 'Prohibited-Business Declaration', 'Beneficial Owner Declaration', 'Source of Funds Declaration'];
const Row = ({ k, v }) => <div className="flex justify-between gap-4 py-1.5 text-sm"><span className="text-slate-500">{k}</span><span className="text-right font-medium">{v}</span></div>;
const Table = ({ head, rows }) => <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-slate-500"><tr>{head.map((h) => <th key={h} className="py-1 pr-4">{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i} className="border-t border-slate-100">{r.map((c, j) => <td key={j} className="py-2 pr-4">{c}</td>)}</tr>)}</tbody></table></div>;

export default function MerchantDetail({ id }) {
  const { toast } = useApp();
  const [m, setM] = useState(null); const [err, setErr] = useState(false); const [tab, setTab] = useState('Overview'); const [dlg, setDlg] = useState(null); const [busy, setBusy] = useState(false);
  const load = useCallback(() => { setErr(false); getMerchant(id).then(setM).catch(() => setErr(true)); }, [id]);
  useEffect(() => { load(); }, [load]);
  const patch = async (p, msg) => { setBusy(true); try { setM(await updateMerchant(id, p)); toast(msg); setDlg(null); } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); } };
  if (err) return <ErrorState onRetry={load} />;
  if (!m) return <Spinner />;
  const done = m.kycStatus === 'Approved' ? 5 : m.kycStatus === 'Under Review' ? 2 : m.kycStatus === 'Rejected' ? 4 : 1;
  const steps = ['Application Submitted', 'Document Review', 'Bank Verification', 'Final Review', m.kycStatus === 'Rejected' ? 'Rejected' : 'Approved'];
  const canSuspend = m.status === 'Active'; const canReactivate = m.status === 'Suspended' || m.status === 'Inactive';
  const kycReport = () => { exportCsv(`${m.id}-kyc-report.csv`, [{ key: 'name', label: 'Document' }, { key: 'status', label: 'Status' }], m.documents); toast('KYC report downloaded'); };
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><Link href={`${B}/merchants`} className="text-sm text-brand">← All Merchants</Link><h1 className="text-2xl font-bold">{m.id} - {m.name} <Badge value={m.status} /></h1><p className="text-sm text-slate-600">{m.mcc} · {m.city} · Submitted on {m.submittedOn}</p></div>
        <div className="flex flex-wrap gap-2"><Link href={`${B}/transactions`}><Button variant="outline">View Transactions</Button></Link>{canSuspend && <Button variant="outline" onClick={() => setDlg('suspend')}>Suspend</Button>}{canReactivate && <Button variant="outline" onClick={() => setDlg('reactivate')}>Reactivate</Button>}<Button onClick={() => setDlg('edit')}>Edit</Button></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <Card title="KYC Progress"><ol className="space-y-3">{steps.map((s, i) => <li key={s} className="flex items-center gap-2 text-sm">{i < done ? <CheckCircle2 size={18} className={m.kycStatus === 'Rejected' && i === 4 ? 'text-red-500' : 'text-emerald-500'} aria-hidden /> : <Circle size={18} className="text-slate-300" aria-hidden />}<span className={i < done ? 'font-medium' : 'text-slate-500'}>{s}</span></li>)}</ol></Card>
        <div className="space-y-4">
          <div role="tablist" className="flex flex-wrap gap-4 border-b border-slate-200">{TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cx('-mb-px border-b-2 px-1 pb-2 text-sm font-medium', tab === t ? 'border-brand text-brand' : 'border-transparent text-slate-600')}>{t}</button>)}</div>
          {tab === 'Overview' && (
            <div className="grid gap-4 xl:grid-cols-3">
              <Card title="Merchant Information" className="xl:col-span-2"><Row k="Trade Name" v={m.name} /><Row k="Legal Name" v={m.legalName} /><Row k="Entity Type" v={m.entityType} /><Row k="Category (MCC)" v={m.mcc} /><Row k="City" v={m.city} /><Row k="Owner Name" v={m.owner} /><Row k="Mobile" v={m.mobile} /><Row k="Email" v={m.email} /><Row k="Estimated Turnover" v={m.turnover} /><Row k="Address" v={m.address} /></Card>
              <div className="space-y-4">
                <Card title="Status Summary"><Row k="KYC Status" v={<Badge value={m.kycStatus} />} /><Row k="Bank Verification" v={<Badge value={m.bankStatus} />} /><Row k="Declarations" v={<Badge value={m.declarations} />} /><Row k="E-sign" v={<Badge value={m.esign} />} /><Row k="Merchant Status" v={<Badge value={m.status} />} /></Card>
                <Card title="Quick Actions"><div className="space-y-2"><Button variant="outline" className="w-full" onClick={() => setTab('KYC & Documents')}>View All Documents</Button><Button variant="outline" className="w-full" onClick={kycReport}>Download KYC Report</Button><Button variant="outline" className="w-full" onClick={() => setDlg('edit')}>Edit Merchant</Button>{(canSuspend || canReactivate) && <Button variant="outline" className="w-full" onClick={() => setDlg(canSuspend ? 'suspend' : 'reactivate')}>{canSuspend ? 'Suspend' : 'Reactivate'} Merchant</Button>}{m.kycStatus !== 'Rejected' && <Button variant="danger" className="w-full" onClick={() => setDlg('reject')}>Reject Merchant</Button>}</div></Card>
              </div>
            </div>)}
          {tab === 'Business Details' && <Card title="Business Information"><Row k="Legal Name" v={m.legalName} /><Row k="Trade Name" v={m.name} /><Row k="Entity Type" v={m.entityType} /><Row k="PAN (entity)" v={m.pan} /><Row k="GSTIN" v={m.gstin} /><Row k="Category (MCC)" v={m.mcc} /><Row k="Expected monthly turnover" v={m.turnover} /><Row k="Registered address" v={m.address} /></Card>}
          {tab === 'KYC & Documents' && <Card title="Documents"><Table head={['Document', 'Status']} rows={m.documents.map((d) => [d.name, <Badge key={d.name} value={d.status} />])} /></Card>}
          {tab === 'Bank Verification' && <Card title="Settlement Bank Account"><Row k="Account Holder" v={m.accountHolder} /><Row k="Bank" v={m.bankName} /><Row k="Account Number" v={m.accountNo} /><Row k="IFSC" v={m.ifsc} /><Row k="Penny Drop" v={<Badge value={m.bankStatus} />} /><Row k="Reference" v={m.pennyRef} /></Card>}
          {tab === 'Declarations & E-sign' && <Card title="Declarations & E-sign"><p className="mb-2 text-xs text-slate-500">Each acceptance stores timestamp, IP, device and document version.</p><Table head={['Declaration', 'Status', 'Accepted At', 'IP', 'Device', 'Version']} rows={DECL.map((d) => [d, <Badge key={d} value={m.declarations} />, m.declarations === 'Accepted' ? m.consent.at : '-', m.declarations === 'Accepted' ? m.consent.ip : '-', m.declarations === 'Accepted' ? m.consent.device : '-', m.consent.version])} /><div className="mt-3"><Row k="E-sign" v={<Badge value={m.esign} />} /></div></Card>}
          {tab === 'Beneficial Owners' && <Card title="Owners / Directors / Beneficial Owners"><Table head={['Name', 'PAN', 'Ownership']} rows={m.beneficialOwners.map((o) => [o.name, o.pan, o.share])} /></Card>}
          {tab === 'Review History' && <Card title="Review History"><Table head={['Date', 'Event', 'By']} rows={m.history.map((h) => [h.date, h.event, h.by])} /></Card>}
        </div>
      </div>
      {dlg === 'suspend' && <ConfirmDialog title="Suspend merchant" message="Simulated: the merchant is marked Suspended in demo data." busy={busy} onConfirm={() => patch({ status: 'Suspended' }, 'Merchant suspended (simulated)')} onCancel={() => setDlg(null)} />}
      {dlg === 'reactivate' && <ConfirmDialog title="Reactivate merchant" message="Simulated: the merchant is marked Active." busy={busy} onConfirm={() => patch({ status: 'Active' }, 'Merchant reactivated (simulated)')} onCancel={() => setDlg(null)} />}
      {dlg === 'reject' && <ConfirmDialog title="Reject merchant" message="Simulated: KYC is marked Rejected and the merchant Inactive." danger busy={busy} onConfirm={() => patch({ kycStatus: 'Rejected', status: 'Inactive' }, 'Merchant rejected (simulated)')} onCancel={() => setDlg(null)} />}
      {dlg === 'edit' && <FormModal title="Edit Merchant" initial={{ mobile: m.mobile.replace(/\D/g, '').slice(-10), email: m.email, address: m.address }} fields={[{ name: 'mobile', label: 'Mobile', required: true, pattern: /^[6-9]\d{9}$/, message: 'Enter 10 digits starting 6-9' }, { name: 'email', label: 'Email', required: true, pattern: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' }, { name: 'address', label: 'Address', required: true }]} onClose={() => setDlg(null)} onSubmit={(v) => patch({ mobile: `+91 ${v.mobile}`, email: v.email, address: v.address }, 'Merchant updated (simulated)')} />}
    </>
  );
}
