'use client';

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Check, X } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Pagination, cx } from '@/components/ui';
import { useApp } from '@/components/ui/AppContext';
import {
  approveAgentApplication,
  rejectAgentApplication,
} from '@/app/super-admin/agent-applications/actions';

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

export default function AgentApplications({ data, status, page = 1, pageSize = 20 }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const { toast } = useApp();
  const [busyId, setBusyId] = useState(null);

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

  const act = async (id, kind) => {
    setBusyId(id);
    try {
      const res =
        kind === 'approve'
          ? await approveAgentApplication(id, '')
          : await rejectAgentApplication(id, 'Did not meet verification requirements');
      if (res.error) {
        toast({ type: 'error', text: res.error });
      } else {
        toast({
          type: 'success',
          text: kind === 'approve' ? 'Approved. Agent role granted.' : 'Rejected.',
        });
        router.refresh();
      }
    } catch {
      toast({ type: 'error', text: 'Could not complete the action.' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-extrabold text-slate-900">
          Agent Applications
        </h1>
        <div className="flex gap-1">
          {STATUSES.map(([value, label]) => {
            const active =
              (status || '') === value ||
              (!status && value === '');
            return (
              <button
                key={value || 'all'}
                onClick={() => setStatus(value)}
                className={cx(
                  'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                  active
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState text="No agent applications yet. Agents will appear here after they complete the verification form inside the collect app." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs text-slate-600">
                {['Name', 'Phone', 'Status', 'Submitted', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-3 py-2 font-semibold"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.application_id || row.applicationId} className="border-t border-slate-100">
                  <td className="px-3 py-2.5">
                    <p className="font-semibold text-slate-900">
                      {row.full_name || row.fullName || '—'}
                    </p>
                    <p className="text-xs text-slate-500">
                      User #{row.user_id || row.userId}
                    </p>
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">
                    {row.phone || '—'}
                  </td>
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
                    {row.submitted_at || row.submittedAt
                      ? new Date(row.submitted_at || row.submittedAt).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })
                      : '—'}
                  </td>
                  <td className="px-3 py-2.5">
                    {String(row.status).toLowerCase() !== 'submitted' ? (
                      <span className="text-xs text-slate-500">—</span>
                    ) : (
                      <div className="flex gap-1.5">
                        <button
                          disabled={busyId === (row.application_id || row.applicationId)}
                          onClick={() =>
                            act(row.application_id || row.applicationId, 'approve')
                          }
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          title="Approve — append AGENT role + issue agent_code"
                        >
                          {busyId === (row.application_id || row.applicationId) ? (
                            '…'
                          ) : (
                            <>
                              <Check size={12} /> Approve
                            </>
                          )}
                        </button>
                        <button
                          disabled={busyId === (row.application_id || row.applicationId)}
                          onClick={() =>
                            act(row.application_id || row.applicationId, 'reject')
                          }
                          className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                          title="Reject with standard decision note"
                        >
                          {busyId === (row.application_id || row.applicationId) ? (
                            '…'
                          ) : (
                            <>
                              <X size={12} /> Reject
                            </>
                          )}
                        </button>
                      </div>
                    )}
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
        Approving a submitted application appends the AGENT role to the existing
        user and assigns an agent_code (AGT-000…) if missing. No changes go in
        until you click Approve.
      </p>
    </div>
  );
}
