'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Drawer,
  EmptyState,
  Pagination,
  Spinner,
  StatCard,
} from '@/components/ui';
import { FormModal } from '@/components/ui/blocks';
import { useApp } from '@/components/ui/AppContext';
import {
  GROUP_BASICS,
  GROUP_CODE_PATTERN,
  GROUP_LIMITS,
  GROUP_STATUSES,
  GROUP_STATUS_OPTIONS,
  SETTLEMENT_CYCLE_OPTIONS,
  SETTLEMENT_CYCLES,
  cycleOf,
} from '@/config/merchantGroups';
import {
  addGroupMember,
  createGroup,
  deleteGroup,
  loadGroupDetail,
  removeGroupMember,
  updateGroup,
} from '@/app/merchant-admin/merchants/groups/actions';

const humanize = (value) =>
  String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const firstError = (result) =>
  result?.error || Object.values(result?.fieldErrors || {})[0] || 'Something went wrong.';

const ownerSearch = {
  resource: 'merchants',
  placeholder: 'Search shop name or merchant code…',
  empty: {
    label: 'No owner — the group is not tied to a lead merchant',
    note: 'You can set one later with Edit.',
  },
  toValue: (row) => row.id,
  toLabel: (row) => `${row.name || row.legalName || row.id} · ${row.id}`,
  toNote: (row) => [row.status, row.raw?.group_code ? `group ${row.raw.group_code}` : 'no group']
    .filter(Boolean)
    .join(' · '),
};

const memberSearch = {
  resource: 'merchants',
  placeholder: 'Search shop name or merchant code…',
  toValue: (row) => row.id,
  toLabel: (row) => `${row.name || row.legalName || row.id} · ${row.id}`,
  toNote: (row) => [
    row.status,
    row.raw?.group_code ? `already in group ${row.raw.group_code}` : 'not in a group',
  ]
    .filter(Boolean)
    .join(' · '),
};

const fields = (mode) => [
  ...(mode === 'create'
    ? [
        {
          name: 'code',
          label: 'Group code',
          hint:
            'Leave blank for a generated GRP-XXXXXXXX code. A code you type is permanent and is ' +
            'what a campaign audience and every audit entry refer to, so it cannot be renamed later.',
          pattern: GROUP_CODE_PATTERN,
          message: 'Letters, digits, dot, underscore or hyphen — up to 40 characters.',
        },
      ]
    : []),
  {
    name: 'name',
    label: 'Group name',
    required: true,
    hint: 'The chain or network name the team will recognise, e.g. “Cafe Chain — North outlets”.',
  },
  {
    name: 'cycle',
    label: 'Settlement cycle',
    type: 'select',
    required: true,
    options: SETTLEMENT_CYCLE_OPTIONS,
    hint: (v) => {
      const cycle = SETTLEMENT_CYCLES[v.cycle];

      return cycle
        ? `${cycle.description} This is the agreement recorded on the group; settlement runs still settle each merchant's own batches.`
        : 'Pick the cycle agreed for this chain. The form explains what the selected cycle means before you save.';
    },
  },
  {
    name: 'owner',
    label: 'Owner merchant (optional)',
    type: 'search',
    hint:
      'The merchant account that represents the group for the team — usually the lead outlet or ' +
      'the head-office account. Search by shop name or merchant code. This does not add the owner ' +
      'to the member list; add it below if it should receive group campaigns. If the owner is not a ' +
      'merchant yet, create it first under All Merchants.',
    search: ownerSearch,
  },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    required: true,
    options: GROUP_STATUS_OPTIONS,
    hint:
      'Active means the chain is in use. Inactive keeps the group and its membership on record ' +
      'without treating it as a live grouping.',
  },
];

const initialOf = (row) => ({
  name: row.name || '',
  cycle: row.cycle || '',
  owner: row.owner || '',
  status: row.status || 'active',
});

export default function MerchantGroups({ data, page, pageSize }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const { toast } = useApp();

  const [add, setAdd] = useState(false);
  const [edit, setEdit] = useState(null);
  const [remove, setRemove] = useState(null);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);

  const rows = data?.rows || [];
  const total = data?.total || 0;
  const summary = data?.summary || { total: 0, active: 0, inactive: 0, unowned: 0, members: 0 };
  const filtered = !!(sp.get('q') || sp.get('status'));

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

    const query = params.toString();
    router.push(query ? `${path}?${query}` : path);
  };

  if (data?.error) {
    return (
      <Card>
        <p role="alert" className="p-6 text-red-600">
          {data.error}
        </p>
      </Card>
    );
  }

  const create = async (values) => {
    const res = await createGroup(values);

    if (res.ok) {
      toast('Group created.');
      setAdd(false);
      router.refresh();
      return;
    }

    toast(firstError(res), 'error');
  };

  const update = async (values) => {
    if (!edit) return;

    const res = await updateGroup(edit.id, values);

    if (res.ok) {
      toast('Group updated.');
      setEdit(null);
      router.refresh();
      return;
    }

    toast(firstError(res), 'error');
  };

  const confirmDelete = async () => {
    if (!remove) return;

    setBusy(true);

    try {
      const res = await deleteGroup(remove.id);

      if (res.ok) {
        toast('Group deleted.');
        setRemove(null);
        router.refresh();
        return;
      }

      toast(firstError(res), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-3xl">
          <h1 className="text-2xl font-bold">Merchant Groups</h1>
          <p className="text-sm text-slate-600">{'Chains and merchant networks, with their members in one place.'}</p>
        </div>

        <Button onClick={() => setAdd(true)}>
          <Plus size={16} aria-hidden />
          Add Group
        </Button>
      </div>

      <Card>
        <h2 className="text-base font-semibold text-slate-900">How a group works, and why they exist</h2>
        <p className="mt-1 max-w-4xl text-sm text-slate-600">
          A group is a label on existing merchants. It does not create a merchant, move money or
          change a merchant’s KYC or pricing. The four points below are the whole model.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {GROUP_BASICS.map((item) => (
            <div key={item.title} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.body}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
        <StatCard label="Groups" value={summary.total} icon={Layers} style={{ minWidth: '18rem' }} />
        <StatCard label="Active groups" value={summary.active} icon={CheckCircle2} color="green" style={{ minWidth: '18rem' }} />
        <StatCard label="Member merchants" value={summary.members} icon={Users} color="purple" style={{ minWidth: '18rem' }} />
        <StatCard
          label="Groups without an owner"
          value={summary.unowned}
          icon={AlertCircle}
          color={summary.unowned ? 'amber' : 'blue'}
          style={{ minWidth: '18rem' }}
        />
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
            <span className="sr-only">Search merchant groups</span>
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" aria-hidden />
            <input
              name="q"
              defaultValue={sp.get('q') || ''}
              placeholder="Search by group name or code..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm"
            />
          </label>

          <select
            aria-label="Group status"
            className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
            value={sp.get('status') || ''}
            onChange={(event) => setParam('status', event.target.value)}
          >
            <option value="">All statuses</option>
            {Object.entries(GROUP_STATUSES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
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
                ? 'No group matches these filters.'
                : 'No merchant groups yet. Add the first chain, then add its merchants as members.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs text-slate-600">
                  {['Group', 'Settlement cycle', 'Owner', 'Members', 'Status', 'Actions'].map((heading) => (
                    <th key={heading} className="whitespace-nowrap px-3 py-2 font-semibold">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => {
                  const cycle = cycleOf(row.cycle);

                  return (
                    <tr key={row.id} className="border-t border-slate-100 cursor-pointer" onClick={() => setSelected(row)}>
                      <td className="px-3 py-2.5">
                        <span className="font-medium text-brand hover:underline">{row.name}</span>
                        <span className="block font-mono text-xs text-slate-500">{row.code}</span>
                      </td>

                      <td className="whitespace-nowrap px-3 py-2.5" title={cycle.description}>
                        <span className="font-medium">{cycle.short}</span>
                        <span className="block text-xs text-slate-500">{cycle.label}</span>
                      </td>

                      <td className="px-3 py-2.5">
                        {row.ownerName ? (
                          <>
                            <span>{row.ownerName}</span>
                            <span className="block font-mono text-xs text-slate-500">{row.owner}</span>
                          </>
                        ) : row.owner ? (
                          <span className="font-mono text-xs text-slate-600">{row.owner}</span>
                        ) : (
                          <span className="text-xs text-slate-400">No owner</span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-3 py-2.5">
                        <span className="font-semibold text-brand hover:underline">
                          {row.members} {row.members === 1 ? 'member' : 'members'}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-3 py-2.5">
                        <Badge value={GROUP_STATUSES[row.status] || humanize(row.status)} />
                      </td>

                      <td className="whitespace-nowrap px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            className="px-2 py-1 text-xs"
                            onClick={(e) => { e.stopPropagation(); setSelected(row); }}
                          >
                            Open
                          </Button>
                          <button
                            type="button"
                            aria-label={`Edit ${row.name}`}
                            title="Edit group"
                            className="rounded p-1.5 text-slate-600 hover:bg-slate-100"
                            onClick={(e) => { e.stopPropagation(); setEdit(row); }}
                          >
                            <Pencil size={15} aria-hidden />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${row.name}`}
                            title={
                              row.members
                                ? 'Remove every member before deleting this group.'
                                : 'Delete group'
                            }
                            className="rounded p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-40"
                            disabled={row.members > 0}
                            onClick={() => setRemove(row)}
                          >
                            <Trash2 size={15} aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {total > pageSize && (
          <div className="mt-3">
            <Pagination
              page={page}
              total={total}
              pageSize={pageSize}
              onPage={(next) => setParam('page', next > 1 ? String(next) : '')}
            />
          </div>
        )}
      </Card>

      {add && (
        <FormModal
          title="Add Group"
          fields={fields('create')}
          initial={{ status: 'active', cycle: 'T1', name: '', code: '', owner: '' }}
          onSubmit={create}
          onClose={() => setAdd(false)}
        />
      )}

      {edit && (
        <FormModal
          title={`Edit ${edit.name}`}
          fields={fields('edit')}
          initial={initialOf(edit)}
          onSubmit={update}
          onClose={() => setEdit(null)}
        />
      )}

      {remove && (
        <ConfirmDialog
          title="Delete group"
          danger
          busy={busy}
          confirmLabel="Delete group"
          message={
            `Delete “${remove.name}” (${remove.code})? ` +
            'The group and its name go away; the member merchants stay exactly as they are. ' +
            'A group with members cannot be deleted — remove the members first.'
          }
          onConfirm={confirmDelete}
          onCancel={() => setRemove(null)}
        />
      )}

      {selected && (
        <GroupDrawer
          group={selected}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setEdit(selected);
            setSelected(null);
          }}
          onRemove={() => {
            setRemove(selected);
            setSelected(null);
          }}
          onChanged={() => router.refresh()}
          toast={toast}
        />
      )}
    </>
  );
}

function GroupDrawer({ group, onClose, onEdit, onRemove, onChanged, toast }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState({ q: '', page: 1 });
  const [term, setTerm] = useState('');
  const [member, setMember] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    const res = await loadGroupDetail(group.id, { q: query.q, page: query.page });

    if (res.error) {
      setLoadError(res.error);
    } else {
      setDetail(res);
    }

    setLoading(false);
  }, [group.id, query]);

  useEffect(() => {
    load();
  }, [load]);

  const viewed = detail?.group || group;
  const cycle = cycleOf(viewed.cycle);

  const add = async (values) => {
    const res = await addGroupMember(group.id, values.merchant);

    if (res.ok) {
      toast('Group membership updated.');
      setAddOpen(false);
      await load();
      onChanged();
      return;
    }

    toast(firstError(res), 'error');
  };

  const remove = async () => {
    if (!member) return;

    setBusy(true);

    try {
      const res = await removeGroupMember(group.id, member.code);

      if (res.ok) {
        toast('Merchant removed from the group.');
        setMember(null);
        await load();
        onChanged();
        return;
      }

      toast(firstError(res), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer title={viewed.name} onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-mono text-xs text-slate-500">{viewed.code}</span>
              <div className="mt-1">
                <Badge value={GROUP_STATUSES[viewed.status] || humanize(viewed.status)} />
              </div>
            </div>
            <div className="flex gap-1.5">
              <Button variant="outline" className="px-2 py-1 text-xs" onClick={onEdit}>
                <Pencil size={14} aria-hidden />
                Edit
              </Button>
              <Button
                variant="outline"
                className="px-2 py-1 text-xs text-red-600"
                disabled={viewed.members > 0}
                title={viewed.members ? 'Remove every member before deleting this group.' : 'Delete group'}
                onClick={onRemove}
              >
                <Trash2 size={14} aria-hidden />
                Delete
              </Button>
            </div>
          </div>

          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Settlement cycle
              </dt>
              <dd className="mt-0.5">
                <span className="font-medium">{cycle.label}</span>
                <p className="mt-0.5 text-xs text-slate-600">{cycle.description}</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Recorded on the group only. Settlement runs still settle each merchant’s own
                  batches, so changing this does not reschedule a payout by itself.
                </p>
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Owner merchant
              </dt>
              <dd className="mt-0.5">
                {viewed.ownerName ? (
                  <>
                    <span className="font-medium">{viewed.ownerName}</span>
                    <span className="ml-2 font-mono text-xs text-slate-500">{viewed.owner}</span>
                  </>
                ) : viewed.owner ? (
                  <span className="font-mono text-xs text-slate-600">{viewed.owner}</span>
                ) : (
                  <span className="text-slate-500">No owner set.</span>
                )}
                <p className="mt-1 text-[11px] text-slate-500">
                  The lead account that represents the chain. Ownership is separate from
                  membership: an owner is not automatically a member.
                </p>
              </dd>
            </div>
          </dl>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900">
              Members{' '}
              <span className="font-normal text-slate-500">
                ({detail?.total ?? viewed.members})
              </span>
            </h3>
            <Button className="px-2 py-1 text-xs" onClick={() => setAddOpen(true)}>
              <Plus size={14} aria-hidden />
              Add merchant
            </Button>
          </div>

          <p className="mt-1 text-xs text-slate-500">
            Members are the merchants that carry this group’s code. One merchant can belong to one
            group; to move one here from another group, remove it there first.
          </p>

          <form
            className="mt-2 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setQuery({ q: term, page: 1 });
            }}
          >
            <input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search members..."
              aria-label="Search group members"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <Button type="submit" variant="outline" className="px-2 py-1 text-xs">
              Search
            </Button>
            {query.q && (
              <Button
                type="button"
                variant="outline"
                className="px-2 py-1 text-xs"
                onClick={() => {
                  setTerm('');
                  setQuery({ q: '', page: 1 });
                }}
              >
                Reset
              </Button>
            )}
          </form>

          {loading ? (
            <Spinner />
          ) : loadError ? (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {loadError}
            </p>
          ) : (detail?.rows || []).length === 0 ? (
            <EmptyState
              text={
                query.q
                  ? 'No member matches that search.'
                  : 'No merchants in this group yet. Add the first one.'
              }
            />
          ) : (
            <>
              <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
                {detail.rows.map((row) => (
                  <li key={row.id} className="flex items-start justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{row.name}</p>
                      <p className="font-mono text-xs text-slate-500">{row.code}</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge value={humanize(row.status)} />
                        <Badge value={humanize(row.kycStatus)} />
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${row.name} from the group`}
                      className="shrink-0 rounded p-1.5 text-red-600 hover:bg-red-50"
                      onClick={() => setMember(row)}
                    >
                      <Trash2 size={15} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>

              {detail.total > detail.pageSize && (
                <div className="mt-2">
                  <Pagination
                    page={detail.page}
                    total={detail.total}
                    pageSize={detail.pageSize}
                    onPage={(next) => setQuery((current) => ({ ...current, page: next }))}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {addOpen && (
        <FormModal
          title={`Add a merchant to ${viewed.name}`}
          fields={[
            {
              name: 'merchant',
              label: 'Merchant',
              type: 'search',
              required: true,
              hint:
                'Search by shop name or merchant code. A merchant can belong to one group only; ' +
                'if it is already in another group, the server will refuse and name that group.',
              search: memberSearch,
            },
          ]}
          onSubmit={add}
          onClose={() => setAddOpen(false)}
        />
      )}

      {member && (
        <ConfirmDialog
          title="Remove member"
          busy={busy}
          confirmLabel="Remove from group"
          message={
            `Remove “${member.name}” (${member.code}) from ${viewed.name}? ` +
            'The merchant keeps its account, KYC and settlement; only the group code is cleared.'
          }
          onConfirm={remove}
          onCancel={() => setMember(null)}
        />
      )}
    </Drawer>
  );
}
