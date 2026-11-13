'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
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
  PARTNER_EXPLAINER,
  PARTNER_STATUS_OPTIONS,
  PARTNER_STATUSES,
  PARTNER_TYPE_OPTIONS,
  PARTNER_TYPES,
} from '@/config/partners';
import {
  createPartner,
  deletePartner,
  updatePartner,
} from '@/app/super-admin/partners/actions';

const CODE_PATTERN = /^[A-Za-z0-9._-]{1,40}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fmt = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '-';

const fields = (mode) => [
  ...(mode === 'create'
    ? [
        {
          name: 'code',
          label: 'Partner Code',
          hint:
            'Leave blank to get an auto-generated PTR-XXXXXXXX code. A code you type here is permanent: ' +
            'it is the key every audit entry and future integration is filed under, and it cannot be renamed later.',
          pattern: CODE_PATTERN,
          message: 'Letters, digits, dot, underscore or hyphen — up to 40 characters.',
        },
      ]
    : []),
  { name: 'name', label: 'Partner Name', required: true },
  {
    name: 'type',
    label: 'What They Do For Us',
    type: 'select',
    required: true,
    options: PARTNER_TYPE_OPTIONS,
    hint: 'Pick the category that describes the relationship, not the product they sell.',
  },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    required: true,
    options: PARTNER_STATUS_OPTIONS,
    hint:
      'Active means the relationship is live today. Pending is signed but not started. ' +
      'Inactive or Suspended keeps the row and its history without pretending it is running.',
  },
  { name: 'contact', label: 'Contact Person' },
  {
    name: 'email',
    label: 'Contact Email',
    pattern: EMAIL_PATTERN,
    message: 'Enter a valid email address.',
  },
  {
    name: 'phone',
    label: 'Contact Phone',
    hint: 'Digits only — 10 for an Indian mobile, up to 15 with a country code. Spaces, + and - are ignored.',
    validate: (values) => {
      const digits = String(values.phone ?? '').replace(/[\s+-]/g, '');
      if (!digits) return '';
      return /^\d{6,15}$/.test(digits) ? '' : 'Enter 6 to 15 digits, or leave it blank.';
    },
  },
];

export default function PartnerDirectory({ data, page, pageSize }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const { toast } = useApp();

  const [add, setAdd] = useState(false);
  const [edit, setEdit] = useState(null);
  const [remove, setRemove] = useState(null);
  const [busy, setBusy] = useState(false);

  const rows = data?.rows || [];
  const total = data?.total || 0;
  const filtered = !!(sp.get('q') || sp.get('type') || sp.get('status'));

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
        setAdd(false);
        setEdit(null);
        setRemove(null);
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

  const initialOf = (row) => ({
    name: row.name || '',
    type: row.type || '',
    status: row.status || '',
    contact: row.contact || '',
    email: row.email || '',
    phone: row.phone || '',
  });

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold">Partners</h1>
          <p className="text-sm text-slate-600">{PARTNER_EXPLAINER}</p>
        </div>

        <Button onClick={() => setAdd(true)}>
          <Plus size={16} aria-hidden />
          Add Partner
        </Button>
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
            <span className="sr-only">Search partners</span>
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" aria-hidden />
            <input
              name="q"
              defaultValue={sp.get('q') || ''}
              placeholder="Search by name or partner code..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm"
            />
          </label>

          <select
            aria-label="Partner type"
            className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
            value={sp.get('type') || ''}
            onChange={(event) => setParam('type', event.target.value)}
          >
            <option value="">All types</option>
            {Object.entries(PARTNER_TYPES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <select
            aria-label="Partner status"
            className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
            value={sp.get('status') || ''}
            onChange={(event) => setParam('status', event.target.value)}
          >
            <option value="">All statuses</option>
            {Object.entries(PARTNER_STATUSES).map(([value, label]) => (
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
                ? 'No partner matches these filters.'
                : 'No partners on file yet. Add the first company we route money through or buy from.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs text-slate-600">
                  {[
                    'Code',
                    'Partner',
                    'Type',
                    'Status',
                    'Contact',
                    'Added',
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
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 cursor-pointer">
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-slate-600">
                      {row.id}
                    </td>

                    <td className="px-3 py-2.5 font-medium">{row.name || '-'}</td>

                    <td className="whitespace-nowrap px-3 py-2.5">
                      {PARTNER_TYPES[row.type] || (
                        <span className="text-orange-600" title="This row predates the type list. Open Edit and pick one to fix it.">
                          {row.type || 'Unclassified'} — needs a type
                        </span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5">
                      <Badge value={PARTNER_STATUSES[row.status] || row.status || 'Unknown'} />
                    </td>

                    <td className="px-3 py-2.5">
                      {row.contact ? <div>{row.contact}</div> : null}
                      {row.email ? <div className="text-xs text-slate-600">{row.email}</div> : null}
                      {row.phone ? <div className="text-xs text-slate-600">{row.phone}</div> : null}
                      {!row.contact && !row.email && !row.phone ? <span className="text-slate-400">-</span> : null}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-600">
                      {fmt(row.created_at)}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-600">
                      {fmt(row.updated_at)}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" className="!px-2 !py-1" onClick={(e) => { e.stopPropagation(); setEdit(row); }}>
                          Edit
                        </Button>

                        <Link
                          href={`/super-admin/audit-logs?resource=partner&resourceId=${encodeURIComponent(row.id)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-lg border border-slate-300 px-2 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Changes
                        </Link>

                        <Button
                          variant="outline"
                          className="!px-2 !py-1 text-red-600"
                          onClick={(e) => { e.stopPropagation(); setRemove(row); }}
                        >
                          Delete
                        </Button>
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

      {add && (
        <FormModal
          title="Add Partner"
          onClose={() => setAdd(false)}
          onSubmit={(values) => run({ action: createPartner, values, done: 'Partner added.' })}
          fields={fields('create')}
        />
      )}

      {edit && (
        <FormModal
          title={`Edit ${edit.name || edit.id}`}
          onClose={() => setEdit(null)}
          initial={initialOf(edit)}
          onSubmit={(values) => run({ action: updatePartner, values, id: edit.id, done: 'Partner updated.' })}
          fields={fields('edit')}
        />
      )}

      {remove && (
        <ConfirmDialog
          title={`Remove ${remove.name || remove.id}?`}
          message={`This deletes the partner row "${remove.id}" from the registry. The audit trail keeps every entry already filed against it, including this removal, but the contact details go with the row and there is no undo. If the relationship simply stopped, set the status to Inactive instead.`}
          confirmLabel="Remove partner"
          danger
          busy={busy}
          onConfirm={() => run({ action: deletePartner, id: remove.id, done: 'Partner removed.' })}
          onCancel={() => setRemove(null)}
        />
      )}
    </>
  );
}
