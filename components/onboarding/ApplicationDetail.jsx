'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, ErrorState, Modal, Spinner, cx } from '@/components/ui';
import { useApp } from '@/components/ui/AppContext';
import { approveApplication, getApplication, rejectApplication, runPennyDrop, verifyDocument } from '@/services';

const B = '/merchant-admin';
const REASONS = ['Invalid PAN', 'Invalid Aadhaar', 'Business Address Invalid', 'GST Verification Failed', 'Bank Verification Failed', 'Incomplete Documents', 'Fraud / Suspicious', 'Other'];
const TABS = ['Overview', 'Documents', 'Bank Verification', 'Business Details'];
const Row = ({ k, v }) => <div className="flex justify-between gap-4 py-1.5 text-sm"><span className="text-slate-500">{k}</span><span className="text-right font-medium">{v}</span></div>;

export default function ApplicationDetail({ id }) {
  const { toast } = useApp();
  const [a, setA] = useState(null); const [err, setErr] = useState(false); const [tab, setTab] = useState('Overview'); const [modal, setModal] = useState(null); const [busy, setBusy] = useState(false);
  const load = useCallback(() => { setErr(false); getApplication(id).then(setA).catch(() => setErr(true)); }, [id]);
  useEffect(() => { load(); }, [load]);
  const run = async (fn, msg) => { setBusy(true); try { setA(await fn()); toast(msg); setModal(null); } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); } };
  if (err) return <ErrorState onRetry={load} />;
  if (!a) return <Spinner />;
  const closed = a.status === 'Approved' || a.status === 'Rejected';
  const docsOk = a.documents.every((d) => d.status === 'Valid'); const bankOk = a.bankStatus === 'Verified';
  const steps = [['Application Submitted', true], ['Document Review', docsOk], ['Bank Verification', bankOk], ['Final Review', closed], [a.status === 'Rejected' ? 'Rejected' : 'Approved / Rejected', closed]];
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><Link href={`${B}/merchants/onboarding/applications`} className="text-sm text-brand">← All applications</Link><h1 className="text-2xl font-bold">{a.id} - {a.merchant} <Badge value={a.status} /></h1><p className="text-sm text-slate-600">{a.category} · Applied on {a.appliedOn} · Sales: {a.salesStaff}</p></div>
        <div className="flex gap-2"><Button disabled={closed} onClick={() => setModal('approve')}>Approve</Button><Button variant="danger" disabled={closed} onClick={() => setModal('reject')}>Reject</Button></div>
      </div>
      {!closed && !(docsOk && bankOk) && <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-800">Approval needs every document marked Valid and the bank account verified.</p>}
      {a.status === 'Approved' && <Card className="text-center"><CheckCircle2 className="mx-auto text-emerald-500" size={40} aria-hidden /><h2 className="mt-2 text-xl font-bold">Merchant Approved Successfully!</h2><p className="text-sm text-slate-600">Merchant ID {a.merchantId} is now Active (simulated). Approved on {a.approvedOn} by Amit Sharma.</p><div className="mt-3 flex justify-center gap-2"><Link href={`${B}/merchants`}><Button variant="outline">Go to Merchant Details</Button></Link><Link href={`${B}/transactions`}><Button>View Transactions</Button></Link></div></Card>}
      {a.status === 'Rejected' && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Rejected: {a.rejectionReason}</p>}
      <div role="tablist" className="flex flex-wrap gap-4 border-b border-slate-200">{TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cx('-mb-px border-b-2 px-1 pb-2 text-sm font-medium', tab === t ? 'border-brand text-brand' : 'border-transparent text-slate-600')}>{t}</button>)}</div>
      {tab === 'Overview' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Merchant Information" className="lg:col-span-2"><Row k="Trade Name" v={a.merchant} /><Row k="Legal Entity" v={a.legalName} /><Row k="Category" v={a.category} /><Row k="Owner" v={a.owner} /><Row k="Mobile" v={a.mobile} /><Row k="Address" v={a.address} /></Card>
          <Card title="KYC Progress"><ol className="space-y-3">{steps.map(([n, done]) => <li key={n} className="flex items-center gap-2 text-sm">{done ? <CheckCircle2 size={18} className="text-emerald-500" aria-hidden /> : <Circle size={18} className="text-slate-300" aria-hidden />}<span className={done ? 'font-medium' : 'text-slate-500'}>{n}</span></li>)}</ol></Card>
        </div>)}
      {tab === 'Documents' && <DocsTab a={a} closed={closed} busy={busy} onSave={(n, s, r) => run(() => verifyDocument(id, n, s, r), 'Verification saved')} />}
      {tab === 'Bank Verification' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Bank Details from Application"><Row k="Bank" v={a.bankName} /><Row k="Account Number" v={a.accountNo} /><Row k="IFSC" v={a.ifsc} /></Card>
          <Card title="Verification Status"><Row k="Status" v={<Badge value={a.bankStatus} />} />{a.pennyRef && <><Row k="Penny Drop Ref" v={a.pennyRef} /><Row k="Amount" v="₹ 1.00 (simulated)" /><Row k="Verified On" v={a.pennyOn} /></>}<Button className="mt-3" disabled={bankOk || closed || busy} onClick={() => run(() => runPennyDrop(id), 'Penny drop verified (simulated)')}>{bankOk ? 'Account Verified' : 'Verify Account (Penny Drop ₹1)'}</Button></Card>
        </div>)}
      {tab === 'Business Details' && <Card title="Business Information"><Row k="Legal Name" v={a.legalName} /><Row k="Trade Name" v={a.merchant} /><Row k="GSTIN" v={a.gstin} /><Row k="Address" v={a.address} /><Row k="Owner" v={a.owner} /></Card>}
      {modal === 'approve' && <ConfirmDialog title="Approve merchant" message="Simulated approval: the merchant becomes Active in demo data. No real KYC clearance happens." confirmLabel="Approve" busy={busy} onConfirm={() => run(() => approveApplication(id), 'Merchant approved (simulated)')} onCancel={() => setModal(null)} />}
      {modal === 'reject' && <RejectModal busy={busy} onClose={() => setModal(null)} onSubmit={(r, m) => run(() => rejectApplication(id, r, m), 'Application rejected (simulated)')} />}
    </>
  );
}

function DocsTab({ a, closed, busy, onSave }) {
  const [i, setI] = useState(0); const d = a.documents[i];
  const [choice, setChoice] = useState('Valid'); const [remarks, setRemarks] = useState('');
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card title="Document List"><ul className="space-y-1">{a.documents.map((x, k) => <li key={x.name}><button onClick={() => { setI(k); setChoice('Valid'); setRemarks(x.remarks || ''); }} className={cx('flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm', k === i ? 'bg-blue-50' : 'hover:bg-slate-50')}><span><b className="block">{x.name}</b><span className="text-xs text-slate-500">{x.file}</span></span><Badge value={x.status} /></button></li>)}</ul></Card>
      <Card title={d.file} className="lg:col-span-1"><div className="grid h-56 place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center text-sm text-slate-500">Document preview<br />(placeholder, demo only)</div></Card>
      <Card title="Verification">
        <fieldset disabled={closed} className="space-y-2 text-sm">{[['Valid', 'Valid Document'], ['Invalid', 'Invalid Document'], ['Re-upload', 'Need Re-upload']].map(([v, l]) => <label key={v} className="flex items-center gap-2"><input type="radio" name="doc" checked={choice === v} onChange={() => setChoice(v)} />{l}</label>)}
          <label className="block font-medium">Remarks (optional)<textarea className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm font-normal" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></label></fieldset>
        <Button className="mt-3 w-full" disabled={closed || busy} onClick={() => onSave(d.name, choice, remarks)}>Save Verification</Button>
      </Card>
    </div>
  );
}

function RejectModal({ onClose, onSubmit, busy }) {
  const [reason, setReason] = useState(''); const [remarks, setRemarks] = useState(''); const [er, setEr] = useState('');
  const go = () => { if (!reason) return setEr('Select a rejection reason'); if (remarks.trim().length < 10) return setEr('Enter a reason (at least 10 characters)'); onSubmit(reason, remarks.trim()); };
  return (
    <Modal title="Reject Application" onClose={onClose}>
      <div className="mb-3 space-y-1 text-sm">{REASONS.map((r) => <label key={r} className="flex items-center gap-2"><input type="radio" name="rr" checked={reason === r} onChange={() => setReason(r)} />{r}</label>)}</div>
      <label className="block text-sm font-medium">Reason for Rejection *<textarea className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm font-normal" rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></label>
      {er && <p role="alert" className="mt-1 text-xs text-red-600">{er}</p>}
      <div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="danger" disabled={busy} onClick={go}>Reject Application</Button></div>
    </Modal>
  );
}
