'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Clock,
  RotateCcw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  Pagination,
  StatCard,
  cx,
  inputCls,
} from '@/components/ui';
import { useApp } from '@/components/ui/AppContext';
import { labelize, utcDate } from '@/lib/api/labels';
import {
  APPROVAL_ACTIONS,
  approvalMeta,
  approvalReference,
  moneyFromPaise,
  payloadRows,
} from '@/config/approvalsRisk';
import { decideApproval } from '@/app/super-admin/maker-checker/actions';
import { searchPeople } from '@/app/super-admin/people/actions';
import SearchPicker from '@/components/superadmin/SearchPicker';

const KEYS = ['status', 'action', 'maker', 'makerName', 'q', 'page'];

const query = (params) => {
  const text = new URLSearchParams();
  KEYS.forEach((key) => {
    const value = params[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      text.set(key, String(value).trim());
    }
  });
  return text.toString();
};

const stamp = (value) => {
  const date = utcDate(value);
  return date
    ? date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';
};

const makerText = (row) => {
  if (row.maker_name || row.maker_email) {
    return row.maker_name || row.maker_email;
  }
  if (Number(row.maker_id) === 0) {
    return 'System (refund flow)';
  }
  return row.maker_id ? `User #${row.maker_id}` : 'Unknown';
};

const checkerText = (row) => {
  if (row.checker_name || row.checker_email) {
    return row.checker_name || row.checker_email;
  }
  return row.checker_id ? `User #${row.checker_id}` : '—';
};

const summary = (row) => {
  const meta = approvalMeta(row.action);
  const reference = approvalReference(row.action, row.payload);
  const amount =
    meta.amountKey && row.payload && row.payload[meta.amountKey] != null
      ? moneyFromPaise(row.payload[meta.amountKey])
      : null;
  return { meta, reference, amount };
};

function Step({ number, title, body }) {
  return (
    <div className="flex gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand">
        {number}
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-600">{body}</p>
      </div>
    </div>
  );
}

export default function ApprovalQueue({ data, filters }) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(filters.q || '');
  const [selected, setSelected] = useState(null);

  const rows = data?.rows || [];
  const counts = data?.counts || {
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
    readyForYou: 0,
  };
  const page = Number(data?.page) || 1;
  const total = Number(data?.total) || 0;
  const limit = Number(data?.limit) || 50;

  const push = (next) => {
    const merged = { ...filters, page: 1, ...next };
    const text = query(merged);
    router.push(text ? `${pathname}?${text}` : pathname);
  };

  const clear = () =>
    push({ action: undefined, maker: undefined, makerName: undefined, q: undefined });

  const actionOptions = useMemo(() => {
    const options = new Map(
      Object.entries(APPROVAL_ACTIONS).map(([code, meta]) => [code, meta.label]),
    );
    rows.forEach((row) => {
      if (!options.has(row.action)) options.set(row.action, approvalMeta(row.action).label);
    });
    if (filters.action && !options.has(filters.action)) {
      options.set(filters.action, approvalMeta(filters.action).label);
    }
    return [...options.entries()];
  }, [rows, filters.action]);

  const tabs = [
    ['Pending', 'pending', counts.pending],
    ['Approved', 'approved', counts.approved],
    ['Rejected', 'rejected', counts.rejected],
    ['All', 'all', counts.total],
  ];

  const emptyText =
    filters.status === 'pending'
      ? 'Nothing is waiting for a checker. Approvals appear here after a maker submits a sensitive action.'
      : 'No requests match this tab and filter. Try another tab, or clear the filters.';

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">Approvals</h1>
        <p className="text-sm text-slate-600">
          Some changes are too consequential for one person to make alone. A maker prepares
          the change, a different checker reviews it here, and only then does the platform
          apply it. Until a request is approved, nothing in this list has taken effect.
        </p>
      </div>

      <Card>
        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <h2 className="text-base font-semibold text-slate-900">How a request moves</h2>
            <p className="mt-1 text-sm text-slate-600">
              Approving a request is a real decision, not a status label. For a settlement,
              refund or dispute, the approval is sent to the route that applies the business
              effect. The person who raised a request can never be the one who approves it;
              rejecting always needs a reason so the maker knows what to fix.
            </p>
          </div>
          <div className="grid gap-3">
            <Step
              number="1"
              title="Maker prepares"
              body="An operator submits a high-value settlement, refund or chargeback decision."
            />
            <Step
              number="2"
              title="Checker reviews"
              body="A different person checks the amount, reference and stored payload."
            />
            <Step
              number="3"
              title="Platform applies"
              body="Approval runs the domain action; rejection leaves the change unapplied."
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Waiting for a checker"
          value={counts.pending.toLocaleString('en-IN')}
          icon={Clock}
          color="amber"
        />
        <StatCard
          label="Ready for you"
          value={counts.readyForYou.toLocaleString('en-IN')}
          icon={ShieldCheck}
          color="blue"
        />
        <StatCard
          label="Approved"
          value={counts.approved.toLocaleString('en-IN')}
          icon={Check}
          color="green"
        />
        <StatCard
          label="Rejected"
          value={counts.rejected.toLocaleString('en-IN')}
          icon={X}
          color="red"
        />
      </div>
      <p className="-mt-1 text-xs text-slate-500">
        Counts cover the whole queue. The filters below only narrow the table. “Ready for
        you” excludes requests you raised yourself, because you cannot check your own work.
      </p>

      <Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-xs font-medium text-slate-600">
            Search
            <div className="relative">
              <Search
                size={15}
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                className={cx(inputCls, 'pl-9')}
                value={search}
                placeholder="request id, batch, refund, dispute…"
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') push({ q: search || undefined });
                }}
              />
            </div>
            <span className="mt-1 block text-[11px] font-normal text-slate-500">
              Matches the action code, the request id and the stored payload. Press Enter.
            </span>
          </label>

          <label className="block text-xs font-medium text-slate-600">
            Request type
            <select
              className={inputCls}
              value={filters.action || ''}
              onChange={(event) =>
                push({ action: event.target.value || undefined })
              }
            >
              <option value="">Any request type</option>
              {actionOptions.map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[11px] font-normal text-slate-500">
              Only the types that can appear in this queue are listed.
            </span>
          </label>

          <SearchPicker
            label="Raised by"
            value={filters.maker}
            name={filters.makerName}
            placeholder="Search a name or email…"
            hint="Filters to one maker. Clear it to see everyone."
            search={(term) => searchPeople(term).then((res) => res.people || [])}
            onPick={(id, name) =>
              push({
                maker: id || undefined,
                makerName: id ? name : undefined,
              })
            }
          />

          <div className="flex flex-wrap items-end gap-2">
            <Button
              variant="outline"
              onClick={() => push({ q: search || undefined })}
            >
              <Search size={15} aria-hidden />
              Search
            </Button>
            <Button variant="outline" onClick={clear}>
              <RotateCcw size={15} aria-hidden />
              Clear
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div
          role="tablist"
          aria-label="Approval status"
          className="mb-3 flex flex-wrap gap-4 border-b border-slate-200"
        >
          {tabs.map(([label, value, count]) => (
            <button
              key={value}
              role="tab"
              aria-selected={filters.status === value}
              onClick={() => push({ status: value })}
              className={cx(
                '-mb-px border-b-2 px-1 pb-2 text-sm font-medium',
                filters.status === value
                  ? 'border-brand text-brand'
                  : 'border-transparent text-slate-600 hover:text-slate-900',
              )}
            >
              {label}{' '}
              <span className="font-normal text-slate-400">
                ({Number(count || 0).toLocaleString('en-IN')})
              </span>
            </button>
          ))}
        </div>

        {data?.error ? (
          <div className="flex flex-col items-center gap-3 p-8 text-center text-red-600">
            <AlertTriangle size={26} aria-hidden />
            <p>Could not load the approval queue.</p>
            <p className="text-sm text-slate-600">{data.error}</p>
            <Button variant="outline" onClick={() => router.refresh()}>
              <RotateCcw size={15} aria-hidden />
              Retry
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState text={emptyText} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-2 py-2">Request</th>
                    <th className="px-2 py-2">What it changes</th>
                    <th className="px-2 py-2">Raised by</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Decided by</th>
                    <th className="px-2 py-2" aria-label="Review" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 align-top">
                  {rows.map((row) => {
                    const { meta, reference, amount } = summary(row);
                    return (
                      <tr key={row.id} className="text-slate-800 cursor-pointer" onClick={() => setSelected(row)}>
                        <td className="whitespace-nowrap px-2 py-2 text-xs">
                          <span className="font-semibold text-slate-900">#{row.id}</span>
                          <span className="block text-slate-500">
                            {stamp(row.created_at)}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <span className="font-medium">{meta.label}</span>
                          <span className="block font-mono text-[11px] text-slate-500">
                            {row.action}
                          </span>
                          {(reference || amount) && (
                            <span className="mt-1 flex flex-wrap gap-2 text-xs text-slate-600">
                              {reference && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">
                                  {reference}
                                </span>
                              )}
                              {amount && <span className="font-semibold">{amount}</span>}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-xs">
                          <span className="font-medium text-slate-800">
                            {makerText(row)}
                          </span>
                          {row.maker_email && row.maker_name && (
                            <span className="block text-slate-500">{row.maker_email}</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <Badge value={labelize(row.status)} />
                        </td>
                        <td className="px-2 py-2 text-xs">
                          <span>{checkerText(row)}</span>
                          {row.decided_at && (
                            <span className="block text-slate-500">
                              {stamp(row.decided_at)}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-right">
                          <Button
                            variant={row.status === 'pending' ? 'primary' : 'outline'}
                            className="px-2.5 py-1 text-xs"
                            onClick={(e) => { e.stopPropagation(); setSelected(row); }}
                          >
                            {row.status === 'pending' ? 'Review' : 'View'}
                            <ArrowRight size={13} aria-hidden />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="pt-3">
              <Pagination
                page={page}
                total={total}
                pageSize={limit}
                onPage={(next) => push({ page: next })}
              />
            </div>
          </>
        )}
      </Card>

      {selected && (
        <ApprovalDrawer
          key={selected.id}
          row={selected}
          me={data?.me}
          onClose={() => setSelected(null)}
          onDone={() => {
            setSelected(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function ApprovalDrawer({ row, me, onClose, onDone }) {
  const { toast } = useApp();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const { meta, reference, amount } = summary(row);
  const pending = row.status === 'pending';
  const selfRaised = Number(row.maker_id) > 0 && Number(row.maker_id) === Number(me?.id);
  const rows = payloadRows(row.payload);
  const noteLength = note.trim().length;

  const decide = async (approve) => {
    setError('');
    if (!approve && noteLength < 8) {
      setError('Give a reason of at least 8 characters so the maker can act on it.');
      return;
    }
    setBusy(true);
    const res = await decideApproval({ id: row.id, approve, note: note.trim() });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    toast(res.message || (approve ? 'Approved.' : 'Rejected.'));
    onDone();
  };

  return (
    <Drawer title={`Approval #${row.id}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge value={labelize(row.status)} />
          <span className="text-xs text-slate-500">Raised {stamp(row.created_at)}</span>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900">{meta.label}</h3>
          <p className="font-mono text-xs text-slate-500">{row.action}</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            What an approval does
          </p>
          <p className="mt-1 text-sm text-slate-700">{meta.effect}</p>
          <p className="mt-2 text-xs text-slate-500">
            Rejecting records the decision but does not apply any of it.
          </p>
        </div>

        {reference && (
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-500">{meta.referenceLabel}</p>
              <p className="font-mono text-sm text-slate-900">{reference}</p>
            </div>
            {amount && (
              <div>
                <p className="text-xs text-slate-500">Amount</p>
                <p className="text-sm font-semibold text-slate-900">{amount}</p>
              </div>
            )}
          </div>
        )}

        <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">Raised by</dt>
            <dd className="text-slate-900">{makerText(row)}</dd>
            {row.maker_email && row.maker_name && (
              <dd className="text-xs text-slate-500">{row.maker_email}</dd>
            )}
          </div>
          <div>
            <dt className="text-xs text-slate-500">Decided by</dt>
            <dd className="text-slate-900">{checkerText(row)}</dd>
            {row.decided_at && (
              <dd className="text-xs text-slate-500">{stamp(row.decided_at)}</dd>
            )}
          </div>
        </dl>

        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Stored request values
          </p>
          {rows.length === 0 ? (
            <p className="text-xs text-slate-500">This request has no payload values.</p>
          ) : (
            <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {rows.map((entry) => (
                <div
                  key={entry.key}
                  className="flex items-start justify-between gap-3 px-3 py-2 text-sm"
                >
                  <dt className="text-slate-500">{entry.label}</dt>
                  <dd className="text-right font-medium text-slate-900">{entry.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className="mt-1 text-[11px] text-slate-500">
            These are the exact values the decision routes receive. Money is shown in
            rupees even though the API stores paise.
          </p>
        </div>

        {row.decision_note && (
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Decision note
            </p>
            <p className="mt-1 text-sm text-slate-700">{row.decision_note}</p>
          </div>
        )}

        {pending ? (
          selfRaised ? (
            <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <AlertTriangle size={18} aria-hidden className="shrink-0" />
              <p>
                You raised this request. A second person has to be the checker, so the
                decision buttons are disabled.
              </p>
            </div>
          ) : (
            <div className="space-y-3 border-t border-slate-200 pt-4">
              <label className="block text-sm font-medium text-slate-700">
                Decision note
                <textarea
                  rows={3}
                  className={inputCls}
                  value={note}
                  placeholder="What did you check? Required when rejecting."
                  onChange={(event) => setNote(event.target.value)}
                />
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  {noteLength}/500 characters. A rejection needs at least 8 characters.
                  The note is stored on the request and in the audit trail.
                </span>
              </label>

              {error && (
                <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={onClose} disabled={busy}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={() => decide(false)} disabled={busy}>
                  {busy ? 'Working…' : 'Reject request'}
                </Button>
                <Button onClick={() => decide(true)} disabled={busy}>
                  {busy ? 'Working…' : meta.domain === 'generic' ? 'Approve' : 'Approve and apply'}
                </Button>
              </div>
              <p className="text-[11px] text-slate-500">
                Approval is final. The queue records who decided and when, and the same
                decision is written to the audit trail.
              </p>
            </div>
          )
        ) : (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            This request was {labelize(row.status).toLowerCase()} and cannot be decided
            again. Open the owning screen to see the resulting record.
          </div>
        )}
      </div>
    </Drawer>
  );
}
