'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Store, CheckCircle2, Clock, IndianRupee } from 'lucide-react';
import { Badge, Card, ErrorState, Spinner, StatCard } from '@/components/ui';
import { getDashboard, getRecentFeeds } from '@/services';
import { inr, num } from '@/lib/format';

const icons = [Store, CheckCircle2, Clock, IndianRupee];
const catColors = ['#2F6FED', '#1E9E6A', '#FF9F1C', '#8B5CF6', '#38BDF8', '#94A3B8'];

function Donut({ data, total, label }) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" innerRadius={50} outerRadius={72} paddingAngle={1} stroke="none">{data.map((d) => <Cell key={d.name} fill={d.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><p className="text-xl font-bold">{num(total)}</p><p className="text-xs text-slate-500">{label}</p></div></div>
      </div>
      <ul className="space-y-1.5 text-sm">{data.map((d) => <li key={d.name} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />{d.name}<b className="ml-auto pl-3">{num(d.value)}</b></li>)}</ul>
    </div>
  );
}

export default function DashboardView() {
  const [d, setD] = useState(null); const [feeds, setFeeds] = useState(null); const [err, setErr] = useState(false);
  const load = () => { setErr(false); Promise.all([getDashboard(), getRecentFeeds()]).then(([a, b]) => { setD(a); setFeeds(b); }).catch(() => setErr(true)); };
  useEffect(load, []);
  if (err) return <ErrorState onRetry={load} />;
  if (!d || !feeds) return <Spinner />;
  const devTotal = d.devices.reduce((s, x) => s + x.value, 0);
  const pendTotal = d.onboarding.reduce((s, x) => s + x.value, 0);
  return (
    <>
      <div><h1 className="text-2xl font-bold">Dashboard</h1><p className="text-sm text-slate-600">Overview of merchant network, payments and settlements.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">{d.stats.map((s, i) => <StatCard key={s.label} {...s} icon={icons[i]} />)}</div>
      {/* <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Transaction Volume (₹ Lakh)" className="xl:col-span-2">
          <div className="h-72" role="img" aria-label="Stacked bar chart of transaction volume by payment method for the last 14 days">
            <ResponsiveContainer width="100%" height="100%"><BarChart data={d.volume}><CartesianGrid vertical={false} stroke="#E2E8F0" /><XAxis dataKey="day" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}L`} /><Tooltip /><Legend /><Bar dataKey="UPI" stackId="a" fill="#2F6FED" /><Bar dataKey="Card" stackId="a" fill="#1E9E6A" /><Bar dataKey="QR" stackId="a" fill="#FF9F1C" /><Bar dataKey="Others" stackId="a" fill="#CBD5E1" /></BarChart></ResponsiveContainer>
          </div>
        </Card>
        <Card title="Merchant Onboarding Status"><Donut data={d.onboarding} total={pendTotal} label="Total Pending" /></Card>
      </div> */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Top Merchant Categories"><ul className="space-y-3">{d.categories.map(([n, p], i) => <li key={n} className="flex items-center gap-3 text-sm"><span className="w-28">{n}</span><span className="h-2 flex-1 rounded bg-slate-100"><span className="block h-2 rounded" style={{ width: `${p * 2.5}%`, background: catColors[i] }} /></span><b className="w-12 text-right">{p}%</b></li>)}</ul></Card>
        <Card title="Top Merchants by Transaction Volume" action={<Link href="/merchant-admin/merchants" className="text-sm font-medium text-brand">View All →</Link>}>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-slate-500"><tr><th className="py-1">#</th><th>Merchant</th><th>Txns</th><th>Volume</th><th>Growth</th></tr></thead><tbody>{d.topMerchants.map(([n, t, v, g], i) => <tr key={n} className="border-t border-slate-100"><td className="py-2">{i + 1}</td><td className="font-medium">{n}</td><td>{num(t)}</td><td>{inr(v)}</td><td className="text-emerald-600">↑ {g}%</td></tr>)}</tbody></table></div>
        </Card>
        {/* <Card title="Device Status" action={<Link href="/merchant-admin/devices/pos" className="text-sm font-medium text-brand">View All →</Link>}><Donut data={d.devices} total={devTotal} label="Total Devices" /></Card> */}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Recent Merchant Onboardings" action={<Link href="/merchant-admin/merchants/onboarding" className="text-sm font-medium text-brand">View All →</Link>}>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-slate-500"><tr><th className="py-1">Merchant</th><th>Category</th><th>Sales Staff</th><th>KYC Status</th><th>Date</th></tr></thead><tbody>{feeds.onboardings.map((r) => <tr key={r.id} className="border-t border-slate-100"><td className="py-2 font-medium">{r.merchant}</td><td>{r.category}</td><td>{r.salesStaff}</td><td><Badge value={r.status} /></td><td className="whitespace-nowrap">{r.appliedOn}</td></tr>)}</tbody></table></div>
        </Card>
        <Card title="Latest Transactions" action={<Link href="/merchant-admin/transactions" className="text-sm font-medium text-brand">View All →</Link>}>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-slate-500"><tr><th className="py-1">Txn ID</th><th>Merchant</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead><tbody>{feeds.transactions.map((r) => <tr key={r.id} className="border-t border-slate-100"><td className="py-2">{r.id}</td><td className="font-medium">{r.merchant}</td><td>{inr(r.amount)}</td><td>{r.method}</td><td><Badge value={r.status} /></td></tr>)}</tbody></table></div>
        </Card>
      </div>
    </>
  );
}
