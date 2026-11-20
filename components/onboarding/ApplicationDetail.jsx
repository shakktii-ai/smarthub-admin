'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, FileText } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, ErrorState, Modal, Spinner, cx, Field, inputCls } from '@/components/ui';
import { useApp } from '@/components/ui/AppContext';
import { approveApplication, getApplication, rejectApplication, startApplicationReview, verifyBank, verifyDocument } from '@/services';

const REASONS = ['Invalid PAN', 'Invalid Aadhaar', 'Business Address Invalid', 'GST Verification Failed', 'Bank Verification Failed', 'Incomplete Documents', 'Fraud / Suspicious', 'Other'];
const TABS = ['Overview', 'Documents', 'Bank Verification', 'Business Details'];
const orDash = (v) => (v === null || v === undefined || v === '' ? '-' : v);
const Row = ({ k, v }) => <div className="flex justify-between gap-4 py-1.5 text-sm"><span className="text-slate-500">{k}</span><span className="text-right font-medium">{orDash(v)}</span></div>;

export default function ApplicationDetail({
  id,
  backHref = '/merchant-admin/merchants/onboarding/applications',
  merchantHref = '/merchant-admin/merchants',
  auditPath = null,
}) {
  const { toast } = useApp();
  const [a, setA] = useState(null); const [err, setErr] = useState(false); const [tab, setTab] = useState('Overview'); const [modal, setModal] = useState(null); const [busy, setBusy] = useState(false);
  const load = useCallback(() => { setErr(false); getApplication(id).then(setA).catch(() => setErr(true)); }, [id]);
  useEffect(() => { load(); }, [load]);
  const run = async (fn, msg) => { setBusy(true); try { setA(await fn()); toast(msg); setModal(null); } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); } };
  if (err) return <ErrorState onRetry={load} />;
  if (!a) return <Spinner />;
  const closed = a.status === 'Approved' || a.status === 'Rejected';
  const docsOk = a.documents.length > 0 && a.documents.every((d) => d.status === 'Verified');
  const bankOk = a.bankStatus === 'Verified';
  const submitted = a.status !== 'Draft';
  const reviewOpen = closed || a.status === 'Under Review';
  const steps = [['Application Submitted', submitted], ['Review Opened', reviewOpen], ['Document Review', docsOk], ['Bank Verification', bankOk], [a.status === 'Rejected' ? 'Rejected' : 'Approved', closed]];
  const gaps = [!docsOk && 'no document has been verified', !bankOk && 'the bank details are not verified'].filter(Boolean).join(' and ');
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><Link href={backHref} className="text-sm text-brand">← All applications</Link><h1 className="text-2xl font-bold">{a.id} - {a.merchant || a.legalName} <Badge value={a.status} /></h1><p className="text-sm text-slate-600">{orDash(a.category)} · Applied on {a.appliedOn}{auditPath && <> · <Link href={`${auditPath}?resource=merchant_application&resourceId=${encodeURIComponent(id)}`} className="font-medium text-brand">decision trail</Link></>}</p></div>
        <div className="flex flex-wrap gap-2">{a.status === 'Submitted' && <Button variant="outline" disabled={busy} onClick={() => run(() => startApplicationReview(id), 'Review started')}>Start Review</Button>}<Button disabled={closed || busy || !submitted} onClick={() => setModal('approve')}>Approve</Button><Button variant="danger" disabled={closed || busy} onClick={() => setModal('reject')}>Reject</Button></div>
      </div>
      {!closed && gaps && <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-800">Checklist incomplete: {gaps}. The backend does not block approval on these, so decide whether to proceed.</p>}
      {a.status === 'Approved' && <Card className="text-center"><CheckCircle2 className="mx-auto text-emerald-500" size={40} aria-hidden /><h2 className="mt-2 text-xl font-bold">Merchant Approved</h2><p className="text-sm text-slate-600">Onboarding for {a.id} is Approved{a.approvedOn ? ` on ${a.approvedOn}` : ''}{a.raw?.merchant_code ? ` and merchant ${a.raw.merchant_code} was created` : ''}.</p><div className="mt-3 flex justify-center gap-2">{a.raw?.merchant_code && <Link href={`${merchantHref}/${encodeURIComponent(a.raw.merchant_code)}`}><Button variant="outline">Open the merchant</Button></Link>}<Link href={merchantHref}><Button>Go to Merchants</Button></Link></div></Card>}
      {a.status === 'Rejected' && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Rejected: {a.rejectionReason}</p>}
      <div role="tablist" className="flex flex-wrap gap-4 border-b border-slate-200">{TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cx('-mb-px border-b-2 px-1 pb-2 text-sm font-medium', tab === t ? 'border-brand text-brand' : 'border-transparent text-slate-600')}>{t}</button>)}</div>
      {tab === 'Overview' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Merchant Information" className="lg:col-span-2"><Row k="Trade Name" v={a.merchant} /><Row k="Legal Entity" v={a.legalName} /><Row k="Owner" v={a.owner} /><Row k="Category" v={a.category} /><Row k="Mobile" v={a.mobile} /><Row k="Email" v={a.email} /><Row k="PAN" v={a.pan} /><Row k="GSTIN" v={a.gstin} /><Row k="City" v={a.city} /></Card>
          <Card title="KYC Progress"><ol className="space-y-3">{steps.map(([n, done]) => <li key={n} className="flex items-center gap-2 text-sm">{done ? <CheckCircle2 size={18} className="text-emerald-500" aria-hidden /> : <Circle size={18} className="text-slate-300" aria-hidden />}<span className={done ? 'font-medium' : 'text-slate-500'}>{n}</span></li>)}</ol><p className="mt-3 text-xs text-slate-500">Document and bank checks are recorded by an operator on this application. {a.raw?.merchant_code ? `Merchant ${a.raw.merchant_code} was created on approval.` : 'The merchant is created when the application is approved.'}</p></Card>
        </div>)}
      {tab === 'Documents' && <DocsTab a={a} closed={closed || busy} onReview={(doc, status, note) => run(() => verifyDocument(id, { ...doc, remarks: note }, status), `${doc.name} ${status.toLowerCase()}`)} />}
      {tab === 'Bank Verification' && <BankTab a={a} busy={closed || busy} onVerify={() => run(() => verifyBank(id), 'Bank details verified')} />}
      {tab === 'Business Details' && <Card title="Business Information"><Row k="Legal Name" v={a.legalName} /><Row k="Trade Name" v={a.merchant} /><Row k="Owner" v={a.owner} /><Row k="Entity Type" v={a.raw?.business_type} /><Row k="Product Type" v={a.raw?.product_type} /><Row k="PAN" v={a.pan} /><Row k="GSTIN" v={a.gstin} /><Row k="Address" v={a.raw?.address} /><Row k="City / State" v={[a.raw?.city, a.raw?.state].filter(Boolean).join(', ')} /><Row k="Pincode" v={a.raw?.pincode} /><Row k="Merchant Code" v={a.raw?.merchant_code} /></Card>}
      {modal === 'approve' && <ConfirmDialog title="Approve merchant" message="Approving creates the merchant account, links the applicant as owner, and moves this application to Approved. This cannot be undone." confirmLabel="Approve" busy={busy} onConfirm={() => run(() => approveApplication(id), 'Application approved')} onCancel={() => setModal(null)} />}
      {modal === 'reject' && <RejectModal busy={busy} onClose={() => setModal(null)} onSubmit={(r, m) => run(() => rejectApplication(id, r, m), 'Application rejected')} />}
    </>
  );
}

function DocsTab({ a, closed, onReview }) {
  const [i, setI] = useState(0); const [note, setNote] = useState(''); const [er, setEr] = useState('');
  const d = a.documents[i];
  if (!a.documents.length) {
    return <Card title="KYC Documents"><div className="py-10 text-center text-sm text-slate-500"><FileText className="mx-auto mb-2 text-slate-300" size={36} aria-hidden /><p>The applicant has not uploaded any KYC documents yet.</p><p className="mt-1 text-xs">Documents are uploaded in the merchant app through the onboarding flow.</p></div></Card>;
  }
  const review = (status) => {
    if (status === 'Rejected' && note.trim().length < 8) {
      setEr('Say what is wrong with it. The applicant sees this note and has to fix it.');
      return;
    }
    setEr('');
    onReview(d, status, note.trim());
  };
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card title="Uploaded Documents"><ul className="space-y-1">{a.documents.map((x, k) => <li key={x.documentRef}><button onClick={() => { setI(k); setNote(''); setEr(''); }} className={cx('flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm', k === i ? 'bg-blue-50' : 'hover:bg-slate-50')}><span><b className="block">{x.name}</b><span className="text-xs text-slate-500">{x.fileName || x.fileKey}</span></span><Badge value={x.status} /></button></li>)}</ul><p className="mt-3 text-xs text-slate-500">Pick a document to look at it before deciding. Every open is written to the audit trail against this reference.</p></Card>
      <Preview doc={d} />
      <Card title="Review">
        <p className="text-sm text-slate-600">Recording the outcome notifies the applicant; the last outcome and any note stay on the record.</p>
        <Field label={d.status === 'Verified' ? 'Review note' : 'Review note (required to reject)'}><textarea rows={3} className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: PAN is legible and the name matches the application." /></Field>
        {er && <p role="alert" className="mt-1 text-xs text-red-600">{er}</p>}
        {d.remarks && <p className="mt-1 text-xs text-slate-500">Previous note: {d.remarks}</p>}
        <div className="mt-3 flex gap-2">
          <Button className="flex-1" disabled={closed || d.status === 'Verified'} onClick={() => review('Verified')}>{d.status === 'Verified' ? 'Already Verified' : 'Mark Verified'}</Button>
          <Button variant="danger" disabled={closed || d.status === 'Rejected'} onClick={() => review('Rejected')}>Reject</Button>
        </div>
        {d.docType === 'pan_card' && <p className="mt-2 text-xs text-slate-500">A verified PAN card is what sets this application&apos;s PAN check; rejecting it clears that check again.</p>}
        <p className="mt-2 text-xs text-slate-500">A document can be reviewed again. The last outcome and note are what stay on the record.</p>
      </Card>
    </div>
  );
}

function Preview({ doc }) {
  const src = doc.documentRef ? `/api/kyc-document/${encodeURIComponent(doc.documentRef)}` : '';
  const isImage = /^image\//.test(doc.contentType || '');
  const isPdf = doc.contentType === 'application/pdf';
  return (
    <Card title={doc.name} className="lg:col-span-1">
      {src && isImage && <img src={src} alt={`${doc.name} uploaded by the applicant`} className="max-h-96 w-full rounded-lg border border-slate-200 bg-slate-50 object-contain" />}
      {src && isPdf && <iframe title={`${doc.name} as uploaded`} src={src} className="h-96 w-full rounded-lg border border-slate-200" />}
      {src && !isImage && !isPdf && <div className="grid h-40 place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-600"><p>This file is not an image or a PDF, so it is downloaded rather than shown. Check it before deciding.</p></div>}
      {!src && <div className="grid h-40 place-items-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-500"><p>No stored file is attached to this record.</p></div>}
      <p className="mt-2 text-xs text-slate-500">{doc.contentType || 'unknown type'}{doc.size ? ` · ${(doc.size / 1024).toFixed(1)} KB` : ''} · Uploaded {doc.uploadedAt || '-'}</p>
      {src && <a href={src} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-medium text-brand">Open full size</a>}
      {doc.fileKey && <code className="mt-2 block break-all text-[11px] text-slate-600">{doc.fileKey}</code>}
    </Card>
  );
}

function BankTab({ a, busy, onVerify }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Captured Bank Details">
        <Row k="Status" v={<Badge value={a.bankStatus} />} />
        <Row k="Account" v={a.bankAccount} />
        <Row k="IFSC" v={a.bankIfsc} />
        <Row k="Documents Verified" v={`${a.documents.filter((d) => d.status === 'Verified').length} of ${a.documents.length}`} />
        <p className="mt-2 text-xs text-slate-500">The app stores only the last four digits and the IFSC. The full account number never reaches the admin surface, so a penny drop cannot be replayed here.</p>
      </Card>
      <Card title="Verify Bank Details">
        <p className="text-sm text-slate-600">Confirm the bank details against the uploaded bank proof (cancelled cheque or statement), then record the check. The applicant is notified of the decision.</p>
        {!a.bankAccount && <p className="mt-2 text-sm text-red-600">This application has no bank details. Reject it and ask the applicant to submit them.</p>}
        <Button className="mt-3 w-full" disabled={busy || a.bankStatus === 'Verified' || !a.bankAccount} onClick={onVerify}>{a.bankStatus === 'Verified' ? 'Already Verified' : busy ? 'Working…' : 'Mark Bank Details Verified'}</Button>
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
      <p className="mt-2 text-xs text-slate-500">The combined reason is stored on the application as <code>rejection_reason</code> and the status becomes Rejected.</p>
      <div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="danger" disabled={busy} onClick={go}>Reject Application</Button></div>
    </Modal>
  );
}
