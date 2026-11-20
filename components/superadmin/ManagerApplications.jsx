'use client';

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Check, X, Eye, FileText, Landmark, Building2, User } from 'lucide-react';
import { Button, Card, Drawer, EmptyState, Pagination, cx } from '@/components/ui';
import { useApp } from '@/components/ui/AppContext';
import {
  approveManagerApplication,
  getManagerApplication,
  rejectManagerApplication,
} from '@/app/super-admin/manager-applications/actions';

const STATUSES = [
  ['', 'All'],
  ['submitted', 'Submitted'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
];

const statusBadge = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'approved') return 'bg-emerald-100 text-emerald-700';
  if (s === 'rejected') return 'bg-rose-100 text-rose-700';
  return 'bg-amber-100 text-amber-800';
};

const PROOF_LABELS = {
  gst: 'GST certificate',
  udyam: 'Udyam (MSME) certificate',
  shop_act: 'Shop & establishment certificate',
  incorporation: 'Certificate of incorporation',
  other: 'Business proof',
};

const rowId = (row) => row.application_id ?? row.applicationId;

export default function ManagerApplications({ data, status, page = 1, pageSize = 20 }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const { toast } = useApp();
  const [busyId, setBusyId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailBusy, setDetailBusy] = useState(false);

  const rows = data?.items || [];
  const total = data?.total || 0;

  const setPage = (next) => {
    const params = new URLSearchParams(sp);
    params.set('page', String(Math.max(1, next)));
    router.push(`${path}?${params.toString()}`);
  };

  const setStatus = (next) => {
    const params = new URLSearchParams(sp);
    if (next) params.set('status', next);
    else params.delete('status');
    params.delete('page');
    router.push(`${path}?${params.toString()}`);
  };

  const openRow = async (row) => {
    setSelected(row);
    setDetail(null);
    setDetailBusy(true);
    const res = await getManagerApplication(rowId(row));
    setDetailBusy(false);
    if (res.error) {
      toast({ type: 'error', text: res.error });
      setSelected(null);
      return;
    }
    setDetail(res.data);
  };

  const close = () => {
    setSelected(null);
    setDetail(null);
  };

  const act = async (id, kind) => {
    setBusyId(id);
    try {
      const res =
        kind === 'approve'
          ? await approveManagerApplication(id, '')
          : await rejectManagerApplication(id, 'Did not meet verification requirements');
      if (res.error) {
        toast({ type: 'error', text: res.error });
      } else {
        toast({
          type: 'success',
          text:
            kind === 'approve'
              ? 'Approved. COLLECT_MANAGER granted and settlement account is set to the KYC bank account.'
              : 'Rejected.',
        });
        router.refresh();
        close();
      }
    } catch {
      toast({ type: 'error', text: 'Could not complete the action.' });
    } finally {
      setBusyId(null);
    }
  };

  const d = detail || selected;
  const isSubmitted = String(d?.status || '').toLowerCase() === 'submitted';
  const id = d?.application_id ?? d?.applicationId;
  const submittedOn = d?.submitted_at || d?.submittedAt;
  const decidedOn = d?.decided_at || d?.decidedAt;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Manager Applications</h1>
          <p className="text-xs text-slate-500">
            One KYC per manager: PAN card, bank details, business proof + basic details.
            Approve to grant COLLECT_MANAGER; collections then settle to this account.
          </p>
        </div>
        <div className="flex gap-1">
          {STATUSES.map(([value, label]) => {
            const active = (status || '') === value || (!status && value === '');
            return (
              <button
                key={value || 'all'}
                onClick={() => setStatus(value)}
                className={cx(
                  'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                  active ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState text="No manager applications yet. Managers will appear here after they complete the verification form inside the collect app." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs text-slate-600">
                {['Manager', 'Business', 'Phone', 'Status', 'Applied', ''].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={rowId(row)} className="border-t border-slate-100">
                  <td className="px-3 py-2.5">
                    <p className="font-semibold text-slate-900">{row.full_name || row.fullName || '—'}</p>
                    <p className="text-xs text-slate-500">User #{row.user_id || row.userId}</p>
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">
                    <p>{row.business_name || '—'}</p>
                    <p className="text-xs text-slate-500">
                      {row.business_proof_type ? PROOF_LABELS[row.business_proof_type] || row.business_proof_type : ''}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">{row.phone || '—'}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={cx(
                        'inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                        statusBadge(row.status),
                      )}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">
                    {submittedOn
                      ? new Date(submittedOn).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                      : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => openRow(row)}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                    >
                      <Eye size={12} /> Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {rows.length > 0 && total > pageSize && (
        <Pagination
          page={page}
          total={total}
          pageSize={pageSize}
          onPage={setPage}
        />
      )}

      <p className="text-xs text-slate-500">
        {total} application{total === 1 ? '' : 's'}. Approving grants COLLECT_MANAGER +
        agent_code, attaches the settlement account to the KYC bank account, and lets the
        manager create staff (COLLECT_AGENT / COLLECT_VIEWER) under his team.
      </p>

      {selected && (
        <Drawer title="Manager KYC review" onClose={close}>
          {detailBusy ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : (
            <div className="space-y-4 text-sm">
              <section>
                <h3 className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <User size={12} /> Personal
                </h3>
                <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  <Row k="Full name" v={d?.full_name} />
                  <Row k="Phone" v={d?.phone} />
                  <Row k="User" v={d ? `#${d.user_id || d.userId}` : '—'} />
                  <Row k="Applied" v={submittedOn ? new Date(submittedOn).toLocaleString('en-IN') : '—'} />
                </dl>
              </section>

              <section>
                <h3 className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <Landmark size={12} /> Bank (settlement account)
                </h3>
                <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  <Row k="PAN" v={d?.pan_number_masked} />
                  <Row k="Account" v={d?.bank_account_masked} />
                  <Row k="IFSC" v={d?.bank_ifsc} />
                  <Row k="Bank" v={d?.bank_name} />
                  <Row k="Account holder" v={d?.account_holder_name} />
                </dl>
              </section>

              <section>
                <h3 className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <Building2 size={12} /> Business
                </h3>
                <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  <Row k="Business name" v={d?.business_name} />
                  <Row k="Proof type" v={d?.business_proof_type ? PROOF_LABELS[d.business_proof_type] || d.business_proof_type : '—'} />
                  <Row k="Proof number" v={d?.business_proof_no} />
                  <Row
                    k="Address"
                    v={[d?.address_line, d?.city, d?.state, d?.pincode].filter(Boolean).join(', ')}
                  />
                </dl>
              </section>

              <section>
                <h3 className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <FileText size={12} /> Documents
                </h3>
                <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {[
                    { kind: 'pan', label: 'PAN card' },
                    { kind: 'bank', label: 'Bank proof' },
                    { kind: 'business', label: 'Business proof' },
                  ].map(({ kind, label }) => {
                    const present = Boolean(d?.documents?.[kind]);
                    const url = d?.document_urls?.[kind];
                    return (
                      <li key={kind} className="flex items-center justify-between gap-3 px-3 py-2">
                        <span className="text-slate-700">{label}</span>
                        {present && url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white hover:bg-slate-700"
                          >
                            Open
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">{present ? 'on file' : 'missing'}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>

              {d?.decision_note && (
                <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                  Note: {d.decision_note}
                </p>
              )}
              {decidedOn && (
                <p className="text-xs text-slate-500">
                  Decided on {new Date(decidedOn).toLocaleString('en-IN')}
                </p>
              )}

              {isSubmitted && (
                <div className="sticky bottom-0 flex gap-2 border-t border-slate-100 bg-white/95 pt-3 backdrop-blur">
                  <Button
                    disabled={busyId === id}
                    onClick={() => act(id, 'approve')}
                    className="flex-1"
                  >
                    {busyId === id ? '…' : (<><Check size={14} className="mr-1 inline" />Approve</>)}
                  </Button>
                  <Button
                    variant="danger"
                    disabled={busyId === id}
                    onClick={() => act(id, 'reject')}
                    className="flex-1"
                  >
                    {busyId === id ? '…' : (<><X size={14} className="mr-1 inline" />Reject</>)}
                  </Button>
                </div>
              )}
            </div>
          )}
        </Drawer>
      )}
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between gap-4 px-3 py-2">
      <dt className="text-slate-500">{k}</dt>
      <dd className="text-right font-medium text-slate-900">{v || '—'}</dd>
    </div>
  );
}
