'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { FileSearch } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Pagination,
} from '@/components/ui';
import { FormModal } from '@/components/ui/blocks';
import { useApp } from '@/components/ui/AppContext';
import {
  MERCHANT_EXPLAINER,
  MERCHANT_KYC_STATUSES,
  MERCHANT_ONBOARDING_NEXT,
  MERCHANT_ONBOARDING_STATUSES,
  MERCHANT_STATUSES,
} from '@/config/onboarding';
import {
  approveMerchant,
  onboardingStep,
  rejectMerchant,
  suspendMerchant,
} from '@/app/super-admin/merchants/actions';

const fmt = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '-';

// MerchantUpdate is a whitelist of profile fields and carries no status, so the only way to
// change a lifecycle state is the transition route the backend exposes.
const nextSteps = (row) =>
  MERCHANT_ONBOARDING_NEXT[String(row.onboarding_status ?? '').toLowerCase()] || [];

export default function MerchantDirectory({ data, page, pageSize }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const { toast } = useApp();

  const [ask, setAsk] = useState(null);
  const [busy, setBusy] = useState(false);

  const rows = data?.rows || [];
  const total = data?.total || 0;
  const filtered = !!(sp.get('q') || sp.get('status') || sp.get('onboarding'));

  const setParam = (key, value) => {
    const params = new URLSearchParams(sp.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    if (key !== 'page') {
      params.delete('page');
    }

    const queryString = params.toString();
    router.push(queryString ? `${path}?${queryString}` : path);
  };

  if (data?.error) {
    return (
      <Card>
        <p role="alert" className="p-6 text-red-600">{data.error}</p>
      </Card>
    );
  }

  const run = async ({ action, values, id, done }) => {
    setBusy(true);
    try {
      const result = await (values === undefined ? action(id) : action(id, values));

      if (result.ok) {
        toast(done);
        setAsk(null);
        router.refresh();
        return;
      }

      toast(
        result.error || Object.values(result.fieldErrors || {})[0] || 'Something went wrong.',
        'error',
      );
    } catch (error) {
      toast(error.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold">Merchants</h1>
          <p className="text-sm text-slate-600">{MERCHANT_EXPLAINER}</p>
        </div>

        <Link
          href="/super-admin/applications"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Applications queue
        </Link>
      </div>

      <Card>
        <form
          className="mb-3 flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setParam('q', new FormData(event.currentTarget).get('q'));
          }}
        >
          <label className="relative min-w-52 flex-1">
            <span className="sr-only">Search merchants</span>
            <input
              name="q"
              defaultValue={sp.get('q') || ''}
              placeholder="Search by code, legal name or trade name..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-3 pr-3 text-sm"
            />
          </label>

          <select
            aria-label="Merchant status"
            className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
            value={sp.get('status') || ''}
            onChange={(event) => setParam('status', event.target.value)}
          >
            <option value="">All merchant statuses</option>
            {Object.entries(MERCHANT_STATUSES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <select
            aria-label="Onboarding status"
            className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
            value={sp.get('onboarding') || ''}
            onChange={(event) => setParam('onboarding', event.target.value)}
          >
            <option value="">All onboarding stages</option>
            {Object.entries(MERCHANT_ONBOARDING_STATUSES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <Button type="button" variant="outline" onClick={() => router.push(path)}>
            Reset
          </Button>
        </form>

        {rows.length === 0 ? (
          <EmptyState
            text={
              filtered
                ? 'No merchant matches these filters.'
                : 'No merchants on file yet. They appear here once an onboarding application is approved.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs text-slate-600">
                  {[
                    'Code',
                    'Merchant',
                    'Category',
                    'Onboarding',
                    'Can take money',
                    'Identifier',
                    'Last Change',
                    'Actions',
                  ].map((heading) => (
                    <th key={heading} className="whitespace-nowrap px-3 py-2 font-semibold">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => {
                  const steps = nextSteps(row);

                  return (
                    <tr key={row.id} className="border-t border-slate-100 cursor-pointer" onClick={() => router.push(`/super-admin/merchants/${encodeURIComponent(row.id)}`)}>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-slate-600">
                        {row.id}
                      </td>

                      <td className="px-3 py-2.5">
                        <div className="font-medium">{row.name || '-'}</div>
                        {row.legal_name && row.legal_name !== row.name ? (
                          <div className="text-xs text-slate-600">{row.legal_name}</div>
                        ) : null}
                      </td>

                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-600">
                        {row.category || '-'}
                      </td>

                      <td className="whitespace-nowrap px-3 py-2.5">
                        <Badge
                          value={
                            MERCHANT_ONBOARDING_STATUSES[row.onboarding_status] ||
                            row.onboarding_status ||
                            'Unknown'
                          }
                        />
                        {row.rejected_reason ? (
                          <div className="mt-1 max-w-48 text-xs text-red-600" title={row.rejected_reason}>
                            {row.rejected_reason}
                          </div>
                        ) : null}
                      </td>

                      <td className="whitespace-nowrap px-3 py-2.5">
                        <Badge value={MERCHANT_STATUSES[row.status] || row.status || 'Unknown'} />
                        <div className="mt-1 text-xs text-slate-600">
                          KYC {MERCHANT_KYC_STATUSES[row.kyc_status] || row.kyc_status || '-'}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-slate-600">
                        {row.identifier || (
                          <span className="text-orange-600" title="Approval is refused until one is set in Edit.">
                            none — blocks approval
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-600">
                        {fmt(row.updated_at)}
                      </td>

                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/super-admin/merchants/${encodeURIComponent(row.id)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-lg bg-blue-600 px-2 py-1 text-sm font-semibold text-white hover:bg-blue-700"
                          >
                            Open
                          </Link>

                          {row.status !== 'active' && row.status !== 'rejected' ? (
                            <Button
                              variant="outline"
                              className="!px-2 !py-1"
                              disabled={busy}
                              onClick={(e) => {
                                e.stopPropagation();
                                setAsk({
                                  kind: 'approve',
                                  row,
                                  message:
                    'Approving makes this merchant Active so it can accept payments. ' +
                    'It is refused without a Zaakpay or custom identifier, and the decision is written to the audit trail.',
                                });
                              }}
                            >
                              Approve
                            </Button>
                          ) : null}

                          {row.status === 'active' ? (
                            <Button
                              variant="outline"
                              className="!px-2 !py-1 text-red-600"
                              disabled={busy}
                              onClick={(e) => {
                                e.stopPropagation();
                                setAsk({
                                  kind: 'suspend',
                                  row,
                                  message:
                    'Suspending stops the merchant from taking new money. The row, its settlement history and every audit entry stay, ' +
                    'and it can be approved again later. Use this rather than deleting when a relationship goes cold.',
                                });
                              }}
                            >
                              Suspend
                            </Button>
                          ) : null}

                          {steps.map(([step, label]) => (
                            <Button
                              key={step}
                              variant={step === 'reject' ? 'danger' : 'outline'}
                              className="!px-2 !py-1"
                              disabled={busy}
                              onClick={(e) => {
                                e.stopPropagation();
                                setAsk({
                                  kind: 'step',
                                  row,
                                  step,
                                  label,
                                  message: 'Moving this onboarding step advances the review state and it is audited against the merchant.',
                                });
                              }}
                            >
                              {label}
                            </Button>
                          ))}

                          <Link
                            href={`/super-admin/audit-logs?resource=merchant&resourceId=${encodeURIComponent(row.id)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            title="Every change recorded against this merchant"
                          >
                            <FileSearch size={14} aria-hidden />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={page}
          total={total}
          pageSize={pageSize}
          onPage={(nextPage) => setParam('page', String(nextPage))}
        />
      </Card>

      {ask && ask.kind !== 'reject' && (
        <ConfirmDialog
          title={ask.kind === 'approve' ? `Approve ${ask.row.name || ask.row.id}?` : `${ask.label || 'Confirm'}?`}
          message={ask.message}
          confirmLabel={ask.kind === 'approve' ? 'Approve merchant' : ask.label || 'Confirm'}
          danger={ask.kind === 'suspend'}
          busy={busy}
          onConfirm={() =>
            run(
              ask.kind === 'approve'
                ? { action: approveMerchant, id: ask.row.id, done: 'Merchant approved.' }
                : ask.kind === 'suspend'
                  ? { action: suspendMerchant, id: ask.row.id, done: 'Merchant suspended.' }
                  : {
                      action: (id) => onboardingStep(id, ask.step),
                      id: ask.row.id,
                      done: `Onboarding moved: ${ask.label}.`,
                    },
            )
          }
          onCancel={() => setAsk(null)}
        />
      )}

      {ask && ask.kind === 'reject' && (
        <FormModal
          title={`Reject ${ask.row.name || ask.row.id}`}
          onClose={() => setAsk(null)}
          onSubmit={(values) =>
            run({ action: rejectMerchant, values, id: ask.row.id, done: 'Merchant rejected.' })
          }
          fields={[
            {
              name: 'reason',
              label: 'Reason the merchant sees',
              type: 'textarea',
              required: true,
              hint:
                'Stored on the merchant and shown in its app, so name the document or detail that has to change. ' +
                'Rejecting moves both the onboarding and the merchant status to Rejected.',
              validate: (values) =>
                String(values.reason ?? '').trim().length >= 8
                  ? ''
                  : 'Say what is wrong — at least 8 characters.',
            },
          ]}
        />
      )}
    </>
  );
}
