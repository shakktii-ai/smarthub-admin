'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FileText, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Badge, Button, Card, ErrorState, Spinner, StatCard } from '@/components/ui';
import { DonutCard } from '@/components/ui/blocks';
import { getOnboardingOverview } from '@/services';

const B = '/merchant-admin/merchants/onboarding';
const COLORS = { Approved: '#1E9E6A', 'Under Review': '#FF9F1C', Submitted: '#F5C84C', Rejected: '#D64545', Draft: '#94A3B8' };

export default function OnboardingOverview() {
  const [d, setD] = useState(null); const [err, setErr] = useState(false);
  const load = () => { setErr(false); getOnboardingOverview().then(setD).catch(() => setErr(true)); };
  useEffect(() => { load(); }, []);
  if (err) return <ErrorState onRetry={load} />;
  if (!d) return <Spinner />;
  const pie = Object.entries(d.counts).map(([name, value]) => ({ name, value, color: COLORS[name] || '#94A3B8' }));
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Onboarding / KYC</h1><p className="text-sm text-slate-600">Applications are submitted from the merchant app. Review documents, verify the bank details, then approve or reject.</p></div>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
        <StatCard label="Total Applications" value={d.total} icon={FileText} color="blue" style={{ minWidth: '18rem' }} />
        <StatCard label="Awaiting Review" value={(d.counts['Under Review'] || 0) + (d.counts.Submitted || 0)} icon={Clock} color="amber" style={{ minWidth: '18rem' }} />
        <StatCard label="KYC Approved" value={d.counts.Approved || 0} icon={CheckCircle2} color="green" style={{ minWidth: '18rem' }} />
        <StatCard label="KYC Rejected" value={d.counts.Rejected || 0} icon={XCircle} color="red" style={{ minWidth: '18rem' }} />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {d.trend.length ? <Card title="Applications Trend (last 14 days)" className="xl:col-span-2"><div className="h-64" role="img" aria-label="Stacked bar chart of applications per day by status"><ResponsiveContainer width="100%" height="100%"><BarChart data={d.trend}><CartesianGrid vertical={false} stroke="#E2E8F0" /><XAxis dataKey="day" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="Approved" stackId="a" fill="#1E9E6A" /><Bar dataKey="Submitted" stackId="a" fill="#F5C84C" /><Bar dataKey="Under Review" stackId="a" fill="#FF9F1C" /><Bar dataKey="Rejected" stackId="a" fill="#D64545" /></BarChart></ResponsiveContainer></div></Card> : <Card title="Applications Trend (last 14 days)" className="xl:col-span-2"><p className="py-16 text-center text-sm text-slate-500">No applications were created in the loaded window, so there is nothing to chart yet.</p></Card>}
        <DonutCard title="KYC Status Distribution" data={pie} ariaLabel="Donut chart of KYC status distribution" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card><p className="text-sm text-slate-600">Awaiting a Decision</p><p className="text-2xl font-bold">{d.pendingDocs}</p><Link className="text-sm text-brand" href={`${B}/applications`}>View applications →</Link></Card>
        <Card><p className="text-sm text-slate-600">KYC Verification Pending</p><p className="text-2xl font-bold">{d.pendingKyc}</p><Link className="text-sm text-brand" href={`${B}/applications`}>View applications →</Link></Card>
      </div>
      <Card title="Recent Applications" action={<Link href={`${B}/applications`} className="text-sm font-medium text-brand">View All →</Link>}>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-slate-500"><tr><th className="py-1">Application</th><th>Merchant</th><th>Category</th><th>Applied On</th><th>KYC Status</th><th /></tr></thead><tbody>{d.recent.map((r) => <tr key={r.id} className="border-t border-slate-100 cursor-pointer" onClick={() => router.push(`${B}/${r.id}`)}><td className="py-2">{r.id}</td><td className="font-medium">{r.merchant}</td><td>{r.category}</td><td>{r.appliedOn}</td><td><Badge value={r.status} /></td><td></td></tr>)}</tbody></table></div>
      </Card>
    </>
  );
}
