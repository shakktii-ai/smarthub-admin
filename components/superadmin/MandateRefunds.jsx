'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button, Card, Modal, cx, inputCls } from '@/components/ui';
import { useApp } from '@/components/ui/AppContext';
import { refundMandateDebit } from '@/app/super-admin/mandate-refunds/actions';
import { num, fmtDate } from '@/lib/format';

const DEBIT_STATUSES = [
  ['', 'All statuses'],
  ['success', 'Success'],
  ['pending', 'Pending'],
  ['failed', 'Failed'],
];
const REFUND_STATUSES = [
  ['', 'All statuses'],
  ['pending', 'Pending'],
  ['success', 'Success'],
  ['failed', 'Failed'],
];

const statusClass = (s) => {
  const v = String(s || '').toLowerCase();
  if (v === 'success') return 'bg-emerald-100 text-emerald-700 ring-emerald-600/10';
  if (v === 'pending' || v === 'notified' || v === 'created') return 'bg-amber-100 text-amber-800 ring-amber-600/10';
  return 'bg-rose-100 text-rose-700 ring-rose-600/10';
};

const TypeBadge = ({ value }) => (
  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 ring-1 ring-inset ring-slate-300">
    {value === 'F' ? 'FULL' : 'PARTIAL'}
  </span>
);

const paiseToRupees = (p) => (Number(p || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export default function MandateRefunds({ debits, refunds, tab = 'debits', q, status, page, pageSize }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const { toast } = useApp();
  const [refunding, setRefunding] = useState(null);

  const debitItems = debits?.items || [];
  const debitTotal = debits?.total || 0;
  const refundItems = refunds?.items || [];
  const refundTotal = refunds?.total || 0;
  const active = tab === 'refunds' ? refundItems : debitItems;
  const total = tab === 'refunds' ? refundTotal : debitTotal;
  const totalPages = Math.max(1, Math.ceil(total / (pageSize || 20)));

  const go = (next) => {
    const sp = new URLSearchParams(params);
    Object.entries(next).forEach(([k, v]) => {
      if (v === undefined || v === '' || v === null) sp.delete(k);
      else sp.set(k, String(v));
    });
    router.push(`${path}?${sp.toString()}`);
  };

  const onSearch = (e) => {
    e.preventDefault();
    const value = e.currentTarget.elements.namedItem('q').value;
    go({ q: value, page: 1 });
  };

  return (
    <div className="space-y-4">
      <Card
        title="Mandate Refunds"
        subtitle="Find a successful debit and reverse it against the customer's mandate. Full refunds are the default; partial amounts come off the debit's remaining refundable balance. Every refund is written to the audit log and reconciled with the provider."
      >
        <form className="mb-4 flex flex-wrap items-center gap-2" onSubmit={onSearch}>
          <input
            name="q"
            defaultValue={q || ''}
            placeholder="Search order id, mandate id, phone or customer name…"
            className={cx(inputCls, 'mt-0 min-w-64 flex-1')}
            aria-label="Search debits and refunds"
          />
          <button
            type="submit"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-brand hover:text-brand"
          >
            Search
          </button>
          <a
            href={path}
            className="rounded-xl border border-transparent px-4 py-2 text-sm font-semibold text-slate-400 hover:text-slate-700"
          >
            Reset
          </a>
        </form>

        <div className="mb-3 flex flex-wrap gap-1 border-b border-slate-200">
          <button
            type="button"
            onClick={() => go({ tab: 'debits', page: 1, status: '' })}
            className={cx(
              'border-b-2 px-4 py-2 text-sm font-semibold transition',
              tab === 'debits'
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-400 hover:text-slate-700',
            )}
          >
            Debits
          </button>
          <button
            type="button"
            onClick={() => go({ tab: 'refunds', page: 1, status: '' })}
            className={cx(
              'border-b-2 px-4 py-2 text-sm font-semibold transition',
              tab === 'refunds'
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-400 hover:text-slate-700',
            )}
          >
            Refunds
          </button>
        </div>

        <div className="mb-3 flex items-center gap-2">
          <label htmlFor="status-filter" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Status
          </label>
          <select
            id="status-filter"
            value={status || ''}
            onChange={(e) => go({ status: e.target.value, page: 1 })}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-brand focus:outline-none"
          >
            {(tab === 'refunds' ? REFUND_STATUSES : DEBIT_STATUSES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
              <tr>
                {tab === 'debits' ? (
                  <>
                    <th className="py-2 pr-4">Order</th>
                    <th className="py-2 pr-4">Mandate</th>
                    <th className="py-2 pr-4">Customer</th>
                    <th className="py-2 pr-4 text-right">Amount</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4 text-right">Refundable</th>
                    <th className="py-2 pr-4">Created</th>
                    <th className="py-2 pr-4 text-right">Action</th>
                  </>
                ) : (
                  <>
                    <th className="py-2 pr-4">Refund</th>
                    <th className="py-2 pr-4">Order</th>
                    <th className="py-2 pr-4">Mandate</th>
                    <th className="py-2 pr-4">Customer</th>
                    <th className="py-2 pr-4 text-right">Amount</th>
                    <th className="py-2 pr-4">Type</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Created</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {active.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-slate-400">
                    {q ? `Nothing matches “${q}”.` : 'No rows to show.'}
                  </td>
                </tr>
              ) : tab === 'debits' ? (
                debitItems.map((row) => {
                  const refundable = Number(row.refundablePaise || 0);
                  const canRefund = String(row.status || '').toLowerCase() === 'success' && refundable > 0;
                  return (
                    <tr key={row.orderId} className="align-top">
                      <td className="py-2.5 pr-4 font-mono text-[12px] text-slate-700">{row.orderId}</td>
                      <td className="py-2.5 pr-4">
                        <div className="font-mono text-[12px] text-slate-700">{row.mandateId}</div>
                        {row.useCase && <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{row.useCase}</div>}
                      </td>
                      <td className="py-2.5 pr-4">
                        <div className="font-medium text-slate-800">{row.customerName}</div>
                        <div className="text-[11px] text-slate-500">{row.customerPhone}</div>
                      </td>
                      <td className="py-2.5 pr-4 text-right font-semibold tabular-nums text-slate-800">₹{paiseToRupees(row.amountPaise)}</td>
                      <td className="py-2.5 pr-4">
                        <span className={cx('inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ring-inset', statusClass(row.status))}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-right">
                        <div className="font-semibold tabular-nums text-slate-800">₹{paiseToRupees(refundable)}</div>
                        {Number(row.refundedPaise || 0) > 0 && (
                          <div className="text-[10px] text-slate-400">refunded ₹{paiseToRupees(row.refundedPaise)}</div>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 text-[12px] text-slate-500">{fmtDate(String(row.createdAt).slice(0, 10))}</td>
                      <td className="py-2.5 pr-4 text-right">
                        <Button
                          variant="danger"
                          className="px-3 py-1.5 text-xs"
                          disabled={!canRefund}
                          onClick={() => setRefunding(row)}
                        >
                          Refund
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                refundItems.map((row) => (
                  <tr key={row.merchantRefundId} className="align-top">
                    <td className="py-2.5 pr-4 font-mono text-[12px] text-slate-700">{row.merchantRefundId}</td>
                    <td className="py-2.5 pr-4 font-mono text-[12px] text-slate-500">{row.orderId}</td>
                    <td className="py-2.5 pr-4">
                      <div className="font-mono text-[12px] text-slate-700">{row.mandateId}</div>
                      {row.useCase && <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{row.useCase}</div>}
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="font-medium text-slate-800">{row.customerName}</div>
                      <div className="text-[11px] text-slate-500">{row.customerPhone}</div>
                    </td>
                    <td className="py-2.5 pr-4 text-right font-semibold tabular-nums text-slate-800">₹{paiseToRupees(row.amountPaise)}</td>
                    <td className="py-2.5 pr-4"><TypeBadge value={row.refundType} /></td>
                    <td className="py-2.5 pr-4">
                      <span className={cx('inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ring-inset', statusClass(row.status))}>
                        {row.status}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-[12px] text-slate-500">{fmtDate(String(row.createdAt).slice(0, 10))}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span>{num(total)} {tab === 'refunds' ? 'refunds' : 'debits'}</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="px-3 py-1.5 text-xs" disabled={page <= 1} onClick={() => go({ page: page - 1 })}>
              Previous
            </Button>
            <span>Page {page} of {totalPages}</span>
            <Button variant="outline" className="px-3 py-1.5 text-xs" disabled={page >= totalPages} onClick={() => go({ page: page + 1 })}>
              Next
            </Button>
          </div>
        </div>
      </Card>

      {refunding && (
        <RefundModal
          debit={refunding}
          onClose={() => setRefunding(null)}
          onDone={() => {
            setRefunding(null);
            toast({ type: 'success', text: 'Refund initiated with the provider.' });
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function RefundModal({ debit, onClose, onDone }) {
  const { toast } = useApp();
  const refundable = Number(debit.refundablePaise || 0);
  const [mode, setMode] = useState('full');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const partialPaise = Math.round((Number(amount) || 0) * 100);
  const amountValid = mode === 'full'
    ? refundable > 0
    : partialPaise > 0 && partialPaise <= refundable;

  const submit = async () => {
    if (!amountValid || busy) return;
    setBusy(true);
    const res = await refundMandateDebit({
      orderId: debit.orderId,
      amountPaise: mode === 'full' ? undefined : partialPaise,
      reason,
    });
    setBusy(false);
    if (res.error) {
      toast({ type: 'error', text: res.error });
      return;
    }
    onDone();
  };

  return (
    <Modal
      title="Refund debit"
      onClose={() => { if (!busy) onClose(); }}
    >
      <div className="space-y-4 text-sm text-slate-700">
        <dl className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3">
          <dt className="text-slate-400">Mandate</dt>
          <dd className="font-mono text-xs">{debit.mandateId}</dd>
          <dt className="text-slate-400">Customer</dt>
          <dd className="font-medium text-slate-800">{debit.customerName} · {debit.customerPhone}</dd>
          <dt className="text-slate-400">Debit</dt>
          <dd className="font-mono text-xs">{debit.orderId}</dd>
          <dt className="text-slate-400">Amount</dt>
          <dd className="font-semibold">₹{paiseToRupees(debit.amountPaise)}</dd>
          <dt className="text-slate-400">Refundable</dt>
          <dd className="font-semibold text-emerald-700">₹{paiseToRupees(refundable)}</dd>
        </dl>

        <fieldset>
          <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Refund type</legend>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
            <input type="radio" name="refund-mode" checked={mode === 'full'} onChange={() => setMode('full')} />
            <span>Full refund — ₹{paiseToRupees(refundable)}</span>
          </label>
          <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
            <input type="radio" name="refund-mode" checked={mode === 'partial'} onChange={() => setMode('partial')} />
            <span>Partial refund</span>
          </label>
        </fieldset>

        {mode === 'partial' && (
          <div>
            <label htmlFor="refund-amount" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Amount (₹)
            </label>
            <input
              id="refund-amount"
              name="refund-amount"
              type="number"
              min="1"
              step="0.01"
              max={refundable / 100}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Up to ₹${paiseToRupees(refundable)}`}
              className={cx(inputCls, 'mt-0')}
              autoFocus
            />
            {partialPaise > refundable && (
              <p className="mt-1 text-xs text-rose-600">More than the refundable balance.</p>
            )}
          </div>
        )}

        <div>
          <label htmlFor="refund-reason" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Reason (kept in the audit log)
          </label>
          <textarea
            id="refund-reason"
            name="refund-reason"
            rows={2}
            maxLength={120}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Double debited on 2026-11-05"
            className={cx(inputCls, 'mt-0')}
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button
            variant="danger"
            disabled={!amountValid || busy}
            onClick={submit}
          >
            {busy ? 'Refunding…' : mode === 'full' ? 'Refund full amount' : 'Refund partial'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
