'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, ErrorState, Field, Modal, Spinner, cx, inputCls } from '@/components/ui';
import { useApp } from '@/components/ui/AppContext';
import { inr } from '@/lib/format';
import { getBorrowerLoans, getLoan, getLoanDocumentUrl, performAction } from '@/services';
import { api } from '@/lib/api/browser';

const DOC_LABELS = {
  aadhaar_front: 'Aadhaar — front',
  aadhaar_back: 'Aadhaar — back',
  pan_card: 'PAN card',
  address_proof: 'Address proof',
  photo: 'Borrower photograph',
  bank_proof: 'Bank proof',
  other: 'Other supporting document',
};
const DOC_STATUS = { uploaded: 'Uploaded', verified: 'Verified', rejected: 'Rejected' };
// The backend only lets an officer record KYC while the loan is still in the application book.
const KYC_STATUSES = ['Applied', 'Submitted', 'Under Review', 'Approved'];

const Row = ({ k, v }) => (
  <div className="flex justify-between gap-4 py-1.5 text-sm">
    <span className="shrink-0 text-slate-500">{k}</span>
    <span className="min-w-0 whitespace-pre-wrap break-words text-right font-medium text-slate-800">{v || '—'}</span>
  </div>
);

export default function LoanReview({ loanRef, backHref = '/collection-admin/loans/applications' }) {
  const { toast } = useApp();
  const [loan, setLoan] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [docDecisions, setDocDecisions] = useState({});
  const [kycNote, setKycNote] = useState('');
  const [viewing, setViewing] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [disburseMethod, setDisburseMethod] = useState('');
  const [disburseRef, setDisburseRef] = useState('');
  const [exposure, setExposure] = useState({ loading: false, items: [], error: null });
  const [autopay, setAutopay] = useState(null);
  const [autopayBusy, setAutopayBusy] = useState(false);

  const load = useCallback(() => {
    setError(null);
    getLoan(loanRef).then(setLoan).catch(setError);
  }, [loanRef]);
  useEffect(load, [load]);

  const loadAutopay = useCallback(() => {
    api.get(`/api/loans/v1/loans/${encodeURIComponent(loanRef)}/autopay`)
      .then(setAutopay)
      .catch(() => setAutopay(null));
  }, [loanRef]);
  useEffect(loadAutopay, [loadAutopay]);

  // Existing exposure on the same phone, so the officer sees what is already outstanding before
  // approving another loan. Read-only: a failure here never blocks the decision.
  useEffect(() => {
    const phone = String(loan?.mobile || '');
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setExposure({ loading: false, items: [], error: null });
      return;
    }
    let alive = true;
    setExposure((e) => ({ ...e, loading: true, error: null }));
    getBorrowerLoans(phone)
      .then((items) => {
        if (alive) setExposure({ loading: false, items: items.filter((r) => r.id !== loanRef), error: null });
      })
      .catch((e) => {
        if (alive) setExposure({ loading: false, items: [], error: e.message });
      });
    return () => {
      alive = false;
    };
  }, [loan?.mobile, loanRef]);

  const run = async (action, success) => {
    setBusy(true);
    try {
      await performAction('c_loans', loanRef, action, loan);
      toast(success);
      setDialog(null);
      load();
    } catch (e) {
      toast(e.message || 'The action failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const openConfirm = (label, message, action, success, danger = false, confirmLabel = 'Confirm') =>
    setDialog({ type: 'confirm', label, message, action, success, danger, confirmLabel });

  const decide = (key, val) =>
    setDocDecisions((d) => {
      const next = { ...d };
      if (next[key] === val) delete next[key];
      else next[key] = val;
      return next;
    });

  const viewDoc = async (doc) => {
    setViewing(doc.storageKey);
    try {
      const { url } = await getLoanDocumentUrl(loanRef, doc.storageKey);
      if (/^https?:\/\//i.test(url)) window.open(url, '_blank', 'noopener,noreferrer');
      else toast('This file is in local memory storage and cannot be opened in a browser. Connect S3 to preview documents.', 'error');
    } catch (e) {
      toast(e.message || 'Could not open the document.', 'error');
    } finally {
      setViewing(null);
    }
  };

  if (error) {
    return (
      <div className="space-y-3">
        <ErrorState onRetry={load} />
        <p className="text-center text-xs text-slate-500">{error.message}</p>
      </div>
    );
  }
  if (!loan) return <Spinner />;

  const docs = loan.documents || [];
  const canKyc = KYC_STATUSES.includes(loan.status) && docs.length > 0;
  const kycCleared = loan.kycStatus === 'Verified' || loan.kycStatus === 'Not Started';
  const canSubmit = loan.status === 'Applied';
  const canReview = loan.status === 'Submitted';
  const canApprove = ['Under Review', 'Submitted'].includes(loan.status);
  const canReject = ['Under Review', 'Submitted', 'Applied'].includes(loan.status);
  const canDisburse = loan.status === 'Approved' && kycCleared;
  const canClose = ['Active', 'Disbursed', 'Approved'].includes(loan.status);
  const decisionCount = Object.keys(docDecisions).length;
  const exposureOutstanding = exposure.items.reduce((sum, r) => sum + (Number(r.outstanding) || 0), 0);
  const merchantLabel = loan.raw?.merchant_code
    || (loan.raw?.merchant_id ? `Linked merchant #${loan.raw.merchant_id}` : 'Individual borrower');

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-brand">
            <ArrowLeft size={15} aria-hidden /> Loan Applications
          </Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-bold text-slate-900">
            <span className="font-mono">{loan.id}</span>
            <Badge value={loan.status} />
            <Badge value={loan.kycStatus} />
          </h1>
          <p className="text-sm text-slate-600">
            {loan.borrower}
            {loan.mobile ? ` · ${loan.mobile}` : ''}
            {loan.product ? ` · ${loan.product}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canSubmit && (
            <Button variant="outline" disabled={busy} onClick={() => openConfirm('Submit application', 'Moves this application to Submitted so it can be reviewed.', { verb: 'submit' }, 'Application submitted')}>
              Submit
            </Button>
          )}
          {canReview && (
            <Button variant="outline" disabled={busy} onClick={() => openConfirm('Send for review', 'Moves this application to Under Review.', { verb: 'review' }, 'Sent for review')}>
              Send for review
            </Button>
          )}
          {canApprove && (
            <Button disabled={busy} onClick={() => openConfirm('Approve loan', 'Approves the loan on the backend. It still has to be disbursed manually.', { verb: 'approve' }, 'Loan approved', false, 'Approve')}>
              Approve
            </Button>
          )}
          {canDisburse && (
            <Button disabled={busy} onClick={() => { setDisburseMethod(''); setDisburseRef(''); setDialog({ type: 'disburse' }); }}>
              <Banknote size={16} aria-hidden /> Disburse
            </Button>
          )}
          {canReject && (
            <Button variant="danger" disabled={busy} onClick={() => { setRejectReason(''); setDialog({ type: 'reject' }); }}>
              Reject
            </Button>
          )}
          {canClose && (
            <Button variant="outline" disabled={busy} onClick={() => openConfirm('Close loan', 'Closes the loan account on the backend. The outstanding principal must be zero.', { verb: 'close' }, 'Loan closed', true, 'Close loan')}>
              Close
            </Button>
          )}
        </div>
      </div>

      {loan.status === 'Approved' && !kycCleared && (
        <p className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle size={16} aria-hidden /> Manual KYC must be verified before this loan can be disbursed.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card title="Documents & manual KYC" subtitle="Open each file, mark it verified or rejected, then record the overall KYC decision.">
            {docs.length === 0 ? (
              <p className="text-sm text-slate-500">No documents were uploaded with this application.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {docs.map((doc) => {
                  const decision = docDecisions[doc.storageKey];
                  const effective = decision || doc.status;
                  return (
                    <div key={doc.storageKey} className="rounded-xl border border-slate-200 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800">{DOC_LABELS[doc.docType] || doc.docType}</p>
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                            <FileText size={13} className="shrink-0" aria-hidden />
                            <span className="truncate">{doc.fileName}</span>
                          </p>
                        </div>
                        <Badge value={DOC_STATUS[effective] || effective} />
                        {doc.verification && (
                          <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            doc.verification.status === 'passed' ? 'bg-emerald-50 text-emerald-700'
                              : doc.verification.status === 'failed' ? 'bg-red-50 text-red-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}>
                            {doc.verification.status === 'passed' ? 'Auto-check passed'
                              : doc.verification.status === 'failed' ? 'Auto-check failed'
                              : 'Auto-check: review'}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button variant="outline" className="!px-2 !py-1" disabled={viewing === doc.storageKey} onClick={() => viewDoc(doc)}>
                          {viewing === doc.storageKey ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <ExternalLink size={14} aria-hidden />} View
                        </Button>
                        {canKyc && (
                          <div className="ml-auto flex items-center gap-1">
                            <button
                              type="button"
                              aria-pressed={decision === 'verified'}
                              onClick={() => decide(doc.storageKey, 'verified')}
                              className={cx('inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition', decision === 'verified' ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-700')}
                            >
                              <CheckCircle2 size={14} aria-hidden /> Verify
                            </button>
                            <button
                              type="button"
                              aria-pressed={decision === 'rejected'}
                              onClick={() => decide(doc.storageKey, 'rejected')}
                              className={cx('inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-semibold transition', decision === 'rejected' ? 'border-red-300 bg-red-50 text-red-600' : 'border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600')}
                            >
                              <XCircle size={14} aria-hidden /> Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {canKyc && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <Field label="KYC note" hint="Optional. Recorded with the decision (max 500 characters).">
                  <textarea
                    rows={3}
                    maxLength={500}
                    className={inputCls}
                    value={kycNote}
                    onChange={(e) => setKycNote(e.target.value)}
                    placeholder="e.g. Aadhaar and PAN match the uploaded documents; address proof verified."
                  />
                </Field>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    disabled={busy}
                    onClick={() => openConfirm(
                      'Verify KYC',
                      `Record manual KYC as verified${decisionCount ? ` with ${decisionCount} document decision${decisionCount > 1 ? 's' : ''}` : ''}. The loan can then be approved and disbursed.`,
                      { verb: 'kyc', status: 'verified', note: kycNote.trim(), documents: docDecisions },
                      'KYC verified',
                      false,
                      'Verify KYC',
                    )}
                  >
                    <ShieldCheck size={16} aria-hidden /> Verify KYC
                  </Button>
                  <Button
                    variant="danger"
                    disabled={busy}
                    onClick={() => openConfirm(
                      'Reject KYC',
                      'Record manual KYC as rejected. The loan cannot be disbursed until KYC is verified.',
                      { verb: 'kyc', status: 'rejected', note: kycNote.trim(), documents: docDecisions },
                      'KYC rejected',
                      true,
                      'Reject KYC',
                    )}
                  >
                    <XCircle size={16} aria-hidden /> Reject KYC
                  </Button>
                  <span className="ml-auto flex items-center gap-2 text-xs text-slate-500">Current <Badge value={loan.kycStatus} /></span>
                </div>
              </div>
            )}
          </Card>

          <Card title="Loan terms">
            <Row k="Product" v={loan.product} />
            <Row k="Principal" v={inr(loan.principal)} />
            <Row k="Interest rate" v={loan.rate != null ? `${loan.rate}% p.a.` : null} />
            <Row k="Tenure" v={loan.tenure ? `${loan.tenure} months` : null} />
            <Row k="EMI" v={inr(loan.emi)} />
            <Row k="Total interest" v={inr(loan.totalInterest)} />
            <Row k="Total payable" v={inr(loan.totalPayable)} />
            <Row k="First EMI due" v={loan.firstEmiDate} />
            <Row k="Next due" v={loan.nextDue} />
          </Card>

          <Card title="Autopay / collection request">
            <Row k="Request" v={loan.collectionRequest} />
            {loan.collectionRail && (
              <>
                <Row k="Rail" v={loan.collectionRail} />
                <Row k="Amount type" v={loan.collectionAmountType} />
                <Row k="Amount" v={loan.collectionAmount} />
                <Row k="Frequency" v={loan.collectionFrequency} />
                <Row k="Start" v={loan.collectionStart} />
                <Row k="End" v={loan.collectionEnd} />
                <Row k="Consent reference" v={loan.consentReference} />
              </>
            )}
            <p className="mt-2 text-xs text-slate-500">Recorded as a request only — collection is authorized separately, not by this application.</p>
          </Card>

          <Card title="AutoPay mandate">
            {autopay?.linked ? (
              <>
                <Row k="Mandate ID" v={autopay.mandate_id} />
                <Row k="Provider" v={autopay.provider} />
                <Row k="Status" v={autopay.status} />
                <Row k="Mode" v={autopay.mode} />
                <Row k="Frequency" v={autopay.frequency} />
                <Row k="Amount" v={autopay.amount_paise != null ? inr(autopay.amount_paise / 100) : null} />
                <p className="mt-2 text-xs text-slate-500">AutoPay is set up after approval — here or through the collect app. Refresh to sync provider status.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button variant="outline" disabled={autopayBusy} onClick={async () => { setAutopayBusy(true); try { await api.post(`/api/loans/v1/loans/${encodeURIComponent(loanRef)}/autopay/refresh`); loadAutopay(); } catch (e) { toast(e.message || 'Refresh failed.', 'error'); } finally { setAutopayBusy(false); } }}>
                    {autopayBusy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null} Refresh
                  </Button>
                  <Button variant="danger" disabled={autopayBusy} onClick={async () => { setAutopayBusy(true); try { await api.post(`/api/loans/v1/loans/${encodeURIComponent(loanRef)}/autopay/revoke`, { reason: 'Revoked by operator' }); loadAutopay(); } catch (e) { toast(e.message || 'Revoke failed.', 'error'); } finally { setAutopayBusy(false); } }}>
                    Revoke
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-500">No AutoPay mandate is linked to this loan yet.</p>
                {autopay?.capability?.supports_mandates ? (
                  <div className="mt-3">
                    <Button disabled={autopayBusy || !['Approved', 'Disbursed', 'Active'].includes(loan.status)} onClick={async () => { setAutopayBusy(true); try { await api.post(`/api/loans/v1/loans/${encodeURIComponent(loanRef)}/autopay`, { mode: 'redirect' }, undefined, { 'Idempotency-Key': crypto.randomUUID() }); loadAutopay(); toast('AutoPay mandate created.', 'success'); } catch (e) { toast(e.message || 'Setup failed.', 'error'); } finally { setAutopayBusy(false); } }}>
                      {autopayBusy ? <Loader2 size={14} className="animate-spin" aria-hidden /> : null} Set up AutoPay
                    </Button>
                    <p className="mt-2 text-xs text-slate-500">Provider: {autopay.capability.provider}. Modes: {autopay.capability.modes.join(', ') || '—'}.</p>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-amber-700">The active payment provider ({autopay?.capability?.provider || 'unknown'}) does not expose a mandate API. AutoPay setup is unavailable.</p>
                )}
              </>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Borrower & identity">
            <Row k="Name" v={loan.borrower} />
            <Row k="Mobile" v={loan.mobile} />
            <Row k="Email" v={loan.email} />
            <Row k="Merchant" v={merchantLabel} />
            <Row k="Customer reference" v={loan.customerReference} />
            <Row k="Loan reference" v={loan.externalLoanReference} />
            <Row k="PAN (masked)" v={loan.panMasked} />
            <Row k="Aadhaar (masked)" v={loan.aadhaarMasked} />
            <Row k="Address" v={loan.borrowerAddress} />
            <p className="mt-2 text-xs text-slate-500">Only masked PAN/Aadhaar are stored. Read the full numbers from the uploaded documents during manual KYC.</p>
          </Card>

          <Card title="Existing exposure" subtitle={loan.mobile ? `Other loans on ${loan.mobile}.` : 'Other loans on this borrower.'}>
            {exposure.loading ? (
              <Spinner />
            ) : exposure.error ? (
              <p className="text-xs text-slate-500">Could not load existing loans: {exposure.error}</p>
            ) : exposure.items.length === 0 ? (
              <p className="text-sm text-slate-500">No other loans found for this borrower.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-slate-500">
                  {exposure.items.length} other loan{exposure.items.length > 1 ? 's' : ''} · outstanding {inr(exposureOutstanding)}.
                </p>
                {exposure.items.map((r) => (
                  <div key={r.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/collection-admin/loans/applications/${r.id}`} className="font-mono text-brand">{r.id}</Link>
                      <Badge value={r.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{r.product} · outstanding {inr(r.outstanding)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {(loan.disbursedOn || loan.disbursementMethod) && (
            <Card title="Disbursement">
              <Row k="Method" v={loan.disbursementMethod} />
              <Row k="Reference" v={loan.disbursementReference} />
              <Row k="Disbursed on" v={loan.disbursedOn} />
              <Row k="Disbursed" v={inr(loan.disbursed)} />
              <Row k="Outstanding" v={inr(loan.outstanding)} />
            </Card>
          )}

          {loan.rejectionReason && (
            <Card title="Rejection reason">
              <p className="whitespace-pre-wrap text-sm text-slate-700">{loan.rejectionReason}</p>
            </Card>
          )}
        </div>
      </div>

      {dialog?.type === 'confirm' && (
        <ConfirmDialog
          title={dialog.label}
          message={dialog.message}
          danger={dialog.danger}
          busy={busy}
          confirmLabel={dialog.confirmLabel}
          onConfirm={() => run(dialog.action, dialog.success)}
          onCancel={() => setDialog(null)}
        />
      )}

      {dialog?.type === 'reject' && (
        <Modal title="Reject application" onClose={() => setDialog(null)}>
          <p className="mb-3 text-sm text-slate-600">The reason is recorded on the loan and shown to the borrower.</p>
          <Field label="Reason *">
            <textarea rows={4} maxLength={500} className={inputCls} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </Field>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button variant="danger" disabled={busy || rejectReason.trim().length < 4} onClick={() => run({ verb: 'reject', note: rejectReason.trim() }, 'Application rejected')}>
              {busy ? 'Working…' : 'Reject application'}
            </Button>
          </div>
        </Modal>
      )}

      {dialog?.type === 'disburse' && (
        <Modal title="Disburse loan" onClose={() => setDialog(null)}>
          <p className="mb-4 text-sm text-slate-600">
            Release {inr(loan.principal)} to {loan.borrower}. Choose how the money leaves — this is recorded on the loan and cannot be undone from the dashboard.
          </p>
          <Field label="Disbursement method *">
            <select className={inputCls} value={disburseMethod} onChange={(e) => setDisburseMethod(e.target.value)}>
              <option value="">Select…</option>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Direct to account (bank transfer)</option>
            </select>
          </Field>
          <Field label="Reference" hint="Optional UTR, receipt or transaction number.">
            <input className={inputCls} maxLength={100} value={disburseRef} onChange={(e) => setDisburseRef(e.target.value)} />
          </Field>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button disabled={busy || !disburseMethod} onClick={() => run({ verb: 'disburse', method: disburseMethod, reference: disburseRef.trim() }, 'Loan disbursed')}>
              {busy ? 'Working…' : `Disburse ${inr(loan.principal)}`}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}