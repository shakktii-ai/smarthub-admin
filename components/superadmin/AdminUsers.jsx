
'use client';

import { useState } from 'react';
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
  inviteAdmin,
  setAdminAccess,
} from '@/app/super-admin/users/actions';

const ROLE_LABEL = {
  merchant_admin: 'Merchant Admin',
  collection_admin: 'Collection Admin',
  upi_admin: 'UPI Admin',
  super_admin: 'Super Admin',
};

const fmt = (d) =>
  d
    ? new Date(d).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '-';

export default function AdminUsers({ data, page, pageSize }) {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const { toast } = useApp();

  const [add, setAdd] = useState(false);
  const [block, setBlock] = useState(null);
  const [unblock, setUnblock] = useState(null);
  const [busy, setBusy] = useState(false);

  const rows = data?.rows || [];
  const total = data?.total || 0;
  const managers = data?.managers || [];
  const branches = data?.branches || [];

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
        <p role="alert" className="p-6 text-red-600">
          {data.error}
        </p>
      </Card>
    );
  }

  const submit = async (values) => {
    const role = Object.keys(ROLE_LABEL).find(
      (key) => ROLE_LABEL[key] === values.role
    );

    if (!role) {
      toast('Please select a valid dashboard role.', 'error');
      return;
    }

    // FormModal select fields may return either an option value
    // or a label, depending on its implementation.
    const selectedBranch = branches.find(
      (branch) =>
        
        `${branch.name} (${branch.code})` === values.branch
    );

    const selectedManager = managers.find(
      (manager) =>
        manager.id === values.manager ||
        manager.full_name === values.manager
    );

    let result;
    try {
      result = await inviteAdmin({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        mobile: values.mobile,
        role,
        branchId: selectedBranch?.id || '',
        reportingManagerId: selectedManager?.id || '',
      });
    } catch (error) {
      console.error('Administrator creation failed:', error);
      toast('Could not create administrator. Please try again.', 'error');
      return;
    }

    if (result.ok) {
     toast('Administrator account created successfully.');
      setAdd(false);
      router.refresh();
      return;
    }

    toast(
      result.error ||
        Object.values(result.fieldErrors || {})[0] ||
        'Could not create administrator.',
      'error'
    );
  };

  const access = async (id, active, reason) => {
    setBusy(true);

    try {
      const result = await setAdminAccess(id, active, reason);

      if (result.ok) {
        toast(active ? 'Access restored' : 'Access blocked');

        if (result.warning) {
          toast(result.warning, 'error');
        }

        setBlock(null);
        setUnblock(null);
        router.refresh();
      } else {
        toast(result.error || 'Could not update access.', 'error');
      }
    } catch {
      toast('Something went wrong. Please try again.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const branchOptions = branches.map(
  (branch) => `${branch.name} (${branch.code})`
);

  const managerOptions = managers.map((manager) => manager.full_name);

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Administrators</h1>
          <p className="text-sm text-slate-600">
            Invite administrators and control their dashboard access.
            Passwords are set by each administrator from the invitation email.
          </p>
        </div>

        <Button onClick={() => setAdd(true)}>
          <Plus size={16} aria-hidden />
          Add Administrator
        </Button>
      </div>

      <Card>
        <form
          className="mb-3 flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            setParam(
              'q',
              new FormData(event.currentTarget).get('q')
            );
          }}
        >
          <label className="relative min-w-52 flex-1">
            <span className="sr-only">Search administrators</span>
            <Search
              size={16}
              className="absolute left-3 top-2.5 text-slate-400"
              aria-hidden
            />
            <input
              name="q"
              defaultValue={sp.get('q') || ''}
              placeholder="Search name or email..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm"
            />
          </label>

          <select
            aria-label="Role"
            className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
            value={sp.get('role') || ''}
            onChange={(event) => setParam('role', event.target.value)}
          >
            <option value="">All roles</option>
            {Object.entries(ROLE_LABEL).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          <select
            aria-label="Status"
            className="rounded-lg border border-slate-300 px-2 py-2 text-sm"
            value={sp.get('status') || ''}
            onChange={(event) => setParam('status', event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>

          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(path)}
          >
            Reset
          </Button>
        </form>

        {rows.length === 0 ? (
          <EmptyState text="No administrators found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs text-slate-600">
                  {[
                    'Name',
                    'Email',
                    'Role',
                    'Branch',
                    'Status',
                    'Created By',
                    'Created At',
                    'Last Sign-in',
                    'Actions',
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="whitespace-nowrap px-3 py-2 font-semibold"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-slate-100"
                  >
                    <td className="whitespace-nowrap px-3 py-2.5 font-medium">
                      {row.full_name || '-'}
                    </td>

                    <td className="px-3 py-2.5">
                      {row.email || '-'}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5">
                      {ROLE_LABEL[row.role] || row.role}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5">
                      {row.branch?.name || '-'}
                      {row.branch?.code ? (
                        <span className="ml-1 text-xs text-slate-500">
                          ({row.branch.code})
                        </span>
                      ) : null}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5">
                      <Badge
                        value={row.is_active ? 'Active' : 'Suspended'}
                      />

                      {!row.is_active && row.suspension_reason && (
                        <span
                          className="ml-1 text-xs text-slate-500"
                          title={row.suspension_reason}
                        >
                          (reason)
                        </span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5">
                      {row.creator?.full_name || '-'}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5">
                      {fmt(row.created_at)}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5">
                      {fmt(row.lastSignIn)}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5">
                      {row.role !== 'super_admin' &&
                        (row.is_active ? (
                          <Button
                            variant="outline"
                            className="!px-2 !py-1"
                            onClick={() => setBlock(row)}
                          >
                            Block
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            className="!px-2 !py-1"
                            onClick={() => setUnblock(row)}
                          >
                            Reactivate
                          </Button>
                        ))}
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
          title="Add Administrator"
          onClose={() => setAdd(false)}
          onSubmit={submit}
          fields={[
            {
              name: 'fullName',
              label: 'Full Name',
              required: true,
            },
            {
              name: 'email',
              label: 'Official Work Email',
              required: true,
              pattern: /^\S+@\S+\.\S+$/,
              message: 'Enter a valid email',
            },
            
{
  name: 'password',
  label: 'Temporary Password',
  type: 'password',
  required: true,
  minLength: 10,
  autoComplete: 'new-password',
  message: 'Use at least 10 characters, including uppercase, lowercase and a number.',
},

            {
              name: 'role',
              label: 'Dashboard Role',
              type: 'select',
              required: true,
              options: [
                'Merchant Admin',
                'Collection Admin',
                'UPI Admin',
              ],
            },
            {
              name: 'branch',
              label: 'Branch',
              type: 'select',
              required: true,
              options: branchOptions,
            },
            {
              name: 'mobile',
              label: 'Mobile Number',
              pattern: /^[6-9]\d{9}$/,
              message: '10 digits starting 6-9',
            },
            {
              name: 'manager',
              label: 'Reporting Manager',
              type: 'select',
              options: managerOptions,
            },
          ]}
        />
      )}

      {block && (
        <FormModal
          title={`Block ${block.full_name}?`}
          onClose={() => setBlock(null)}
          onSubmit={(values) =>
            access(block.id, false, values.reason)
          }
          fields={[
            {
              name: 'reason',
              label:
                'Reason (optional). The administrator loses dashboard access; data and history are kept.',
            },
          ]}
        />
      )}

      {unblock && (
        <ConfirmDialog
          title="Reactivate administrator"
          message={`Restore dashboard access for ${unblock.full_name}?`}
          busy={busy}
          onConfirm={() => access(unblock.id, true)}
          onCancel={() => setUnblock(null)}
        />
      )}
    </>
  );
}
