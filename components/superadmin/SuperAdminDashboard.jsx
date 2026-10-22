'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, ErrorState, Spinner, StatCard } from '@/components/ui';
import { DonutCard } from '@/components/ui/blocks';
import { ROLE_LABELS } from '@/config/auth';
import { getSuperAdminDashboard } from '@/services';
import { listDashboardAdmins } from '@/app/super-admin/users/actions';

const Table = ({ head, rows }) => <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-slate-500"><tr>{head.map((h) => <th key={h} className="py-1 pr-3">{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i} className="border-t border-slate-100">{r.map((c, j) => <td key={j} className="py-2 pr-3">{c}</td>)}</tr>)}</tbody></table></div>;

export default function SuperAdminDashboard() {
  const [d, setD] = useState(null); const [err, setErr] = useState(false);
  const load = () => {
    setErr(false);
    Promise.all([getSuperAdminDashboard(), listDashboardAdmins()])
      .then(([dashboard, admins]) => {
        if (admins.error) throw new Error(admins.error);
        setD({ ...dashboard, admins: admins.rows });
      })
      .catch(() => setErr(true));
  };
  useEffect(() => { load(); }, []);
  if (err) return <ErrorState onRetry={load} />;
  if (!d) return <Spinner />;
  return (
    <>
      <div><h1 className="text-2xl font-bold">Super Admin Dashboard</h1><p className="text-sm text-slate-600">Platform-wide view across Merchant, Collect and UPI, plus approvals, risk and access control.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">{d.stats.map((s) => <StatCard key={s.label} {...s} />)}</div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Administrators" className="xl:col-span-2" action={<Link href="/super-admin/users" className="text-sm font-medium text-brand">View All →</Link>}><Table head={['Name', 'Role', 'Branch', 'Status']} rows={d.admins.map((admin) => [admin.full_name || '-', ROLE_LABELS[admin.role] || admin.role, admin.branch?.name || '-', <Badge key={admin.id} value={admin.is_active ? 'Active' : 'Suspended'} />])} /></Card>
        <DonutCard title="Admin users by dashboard" data={d.rolesDist} ariaLabel="Donut chart of admin users by dashboard" />
      </div>
      <Card title="Recent Audit Events" action={<Link href="/super-admin/audit-logs" className="text-sm font-medium text-brand">View All →</Link>}><Table head={['Time', 'User', 'Action', 'Entity', 'Change']} rows={d.audit.map((a) => [a.time, a.user, a.action, a.entity, a.change])} /></Card>
    </>
  );
}
