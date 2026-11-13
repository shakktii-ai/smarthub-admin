'use client';

import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { FileSearch, Inbox, Search, ShieldCheck } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Pagination } from '@/components/ui';
import { APPLICATION_EXPLAINER, APPLICATION_STATUSES } from '@/config/onboarding';

const fmt = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '-';

// A review queue is only useful if the rows that need a decision are the ones on screen, so the
// chips are quick filters over the same status the backend already filters on — no new endpoint.
const QUICK = ['submitted', 'under_review', 'approved', 'rejected'];

const Check = ({ ok, label }) => (
  <span
    className={ok ? 'inline-flex items-center gap-1 text-emerald-600' : 'inline-flex items-center gap-1 text-slate-400'}
    title={`${label}: ${ok ? 'verified' : 'not verified yet'}`}
  >
    <ShieldCheck size={14} aria-hidden />
    <span className="text-xs">{label}</span>
    <span className="sr-only">{ok ? 'verified' : 'not verified'}</span>
  </span>
);

export default function ApplicationQueue({ data, page, pageSize }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();

  const rows = data?.rows || [];
  const total = data?.total || 0;
  const status = sp.get('status') || '';
  const q = sp.get('q') || '';
  const filtered = !!(q || status);

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

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold">Onboarding Applications</h1>
          <p className="text-sm text-slate-600">{APPLICATION_EXPLAINER}</p>
        </div>

        <Link
          href="/super-admin/audit-logs?resource=merchant_application"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Decision trail
        </Link>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
        <Button
          variant={status ? 'outline' : 'primary'}
          onClick={() => setParam('status', '')}
        >
          All statuses
        </Button>
        {QUICK.map((value) => (
          <Button
            key={value}
            variant={status === value ? 'default' : 'outline'}
            onClick={() => setParam('status', value)}
          >
            {APPLICATION_STATUSES[value]}
          </Button>
        ))}
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
            <span className="sr-only">Search applications</span>
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" aria-hidden />
            <input
              name="q"
              defaultValue={q}
              placeholder="Search by reference, business name or phone..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm"
            />
          </label>

          <select
            aria-label="Application status"
            className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
            value={status}
            onChange={(event) => setParam('status', event.target.value)}
          >
            <option value="">All statuses</option>
            {Object.entries(APPLICATION_STATUSES).map(([value, label]) => (
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
                ? 'No application matches these filters.'
                : 'No merchant has submitted an application yet. They arrive from the merchant app, so there is nothing to add here.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs text-slate-600">
                  {[
                    'Reference',
                    'Business',
                    'Contact',
                    'City',
                    'Checks',
                    'Status',
                    'Submitted',
                    'Actions',
                  ].map((heading) => (
                    <th key={heading} className="whitespace-nowrap px-3 py-2 font-semibold">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.ref} className="border-t border-slate-100 cursor-pointer" onClick={() => router.push(`/super-admin/applications/${encodeURIComponent(row.ref)}`)}>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-slate-600">
                      {row.ref}
                    </td>

                    <td className="px-3 py-2.5">
                      <div className="font-medium">{row.business || '-'}</div>
                      <div className="text-xs text-slate-600">{row.category || 'No category'}</div>
                    </td>

                    <td className="px-3 py-2.5">
                      {row.owner ? <div>{row.owner}</div> : null}
                      <div className="text-xs text-slate-600">{row.phone}</div>
                      {row.email ? <div className="text-xs text-slate-600">{row.email}</div> : null}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-600">
                      {row.city || '-'}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5">
                      <div className="flex flex-col gap-1">
                        <Check ok={row.pan_verified} label="PAN" />
                        <Check ok={row.bank_verified} label="Bank" />
                      </div>
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5">
                      <Badge value={APPLICATION_STATUSES[row.status] || row.status || 'Unknown'} />
                      {row.status === 'rejected' && row.rejection_reason ? (
                        <div className="mt-1 max-w-48 text-xs text-red-600" title={row.rejection_reason}>
                          {row.rejection_reason}
                        </div>
                      ) : null}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-600">
                      {fmt(row.submitted_at || row.created_at)}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/super-admin/applications/${encodeURIComponent(row.ref)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-lg bg-blue-600 px-2 py-1 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                          {row.status === 'submitted' || row.status === 'under_review'
                            ? 'Review'
                            : 'Open'}
                        </Link>

                        <Link
                          href={`/super-admin/audit-logs?resource=merchant_application&resourceId=${encodeURIComponent(row.ref)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          title="Every decision recorded against this reference"
                        >
                          <FileSearch size={14} aria-hidden />
                        </Link>

                        {row.merchant_code ? (
                          <Link
                            href={`/super-admin/merchants/${encodeURIComponent(row.merchant_code)}`}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            title={`Approved as merchant ${row.merchant_code}`}
                          >
                            <Inbox size={14} aria-hidden />
                            {row.merchant_code}
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
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
    </>
  );
}
