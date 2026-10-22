'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Area, AreaChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { IndianRupee, Wallet, CheckCircle2, AlertTriangle, Percent, Users, FileText, ChevronRight } from 'lucide-react';
import { Badge, Button, Card, ErrorState, Spinner, StatCard } from '@/components/ui';
import { useApp } from '@/components/ui/AppContext';
import { collectEmi, getCollectionDashboard } from '@/services';
import { inr, num } from '@/lib/format';

const B = '/collection-admin';
const icons = [IndianRupee, Wallet, CheckCircle2, AlertTriangle, Percent, Users];
const QUICK = [['Add Loan Account', 'Create a new loan account', '/loans/accounts'], ['Record Payment', 'Add received payment', '/payments'], ['Add Follow-up', 'Create collection follow-up', '/collections/followups'], ['Add Promise to Pay', 'Record borrower commitment', '/collections/promises'], ['Generate Collection Report', 'Download detailed report', '/reports/collection']];

function Donut({ data, total, label, money }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="relative h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" innerRadius={50} outerRadius={72} paddingAngle={1} stroke="none">{data.map((d) => <Cell key={d.name} fill={d.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><p className="text-sm font-bold">{money ? inr(total) : num(total)}</p><p className="text-xs text-slate-500">{label}</p></div></div>
      </div>
      <ul className="space-y-1.5 text-sm">{data.map((d) => <li key={d.name} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />{d.name}<b className="ml-auto pl-3">{money ? inr(d.value) : num(d.value)}</b>{d.share && <span className="text-slate-500">{d.share}</span>}</li>)}</ul>
    </div>
  );
}

const Link2 = ({ href }) => <Link href={`${B}${href}`} className="text-sm font-medium text-brand">View All →</Link>;
const Table = ({ head, children }) => <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-slate-500"><tr>{head.map((h) => <th key={h} className="py-1 pr-3 font-semibold">{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;

export default function CollectionDashboard() {
  const { toast } = useApp();
  const [d, setD] = useState(null); const [err, setErr] = useState(false);
  const load = () => { setErr(false); getCollectionDashboard().then(setD).catch(() => setErr(true)); };
  useEffect(() => { load(); }, []);
  const collect = async (id) => { try { await collectEmi(id); toast('EMI collected (simulated)'); load(); } catch (e) { toast(e.message, 'error'); } };
  if (err) return <ErrorState onRetry={load} />;
  if (!d) return <Spinner />;
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Collection Dashboard</h1><p className="text-sm text-slate-600">Track EMI collections, overdue accounts and team performance.</p></div>
        <Button variant="outline" onClick={() => toast('Report generated (simulated). Download it from Collection Reports.')}><FileText size={16} aria-hidden />Generate Report</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">{d.stats.map((s, i) => <StatCard key={s.label} {...s} icon={icons[i]} />)}</div>
      {/* <div className="grid gap-4 xl:grid-cols-3">
        <Card title="Collection Trend (₹ Lakh)" className="xl:col-span-1"><div className="h-60" role="img" aria-label="Area chart of amount due versus collected per day"><ResponsiveContainer width="100%" height="100%"><AreaChart data={d.trend}><CartesianGrid vertical={false} stroke="#E2E8F0" /><XAxis dataKey="day" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Area dataKey="Due" stroke="#2F6FED" fill="#2F6FED22" /><Area dataKey="Collected" stroke="#1E9E6A" fill="#1E9E6A33" /></AreaChart></ResponsiveContainer></div></Card>
        <Card title="Overdue Aging"><Donut data={d.aging} total={d.totalOverdue} label="Total Overdue" money /></Card>
        <Card title="Loan Status"><Donut data={d.loanStatus} total={d.totalLoans} label="Total Loans" /></Card>
      </div> */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Recent Payments" action={<Link2 href="/payments" />}><Table head={['Date & Time', 'Borrower', 'Loan ID', 'Amount', 'Method', 'Status']}>{d.recentPayments.map((p) => <tr key={p.id} className="border-t border-slate-100"><td className="whitespace-nowrap py-2 pr-3">{p.dateTime}</td><td className="pr-3 font-medium">{p.borrower}</td><td className="pr-3">{p.loan}</td><td className="pr-3">{inr(p.amount)}</td><td className="pr-3">{p.method}</td><td><Badge value={p.status} /></td></tr>)}</Table></Card>
        <Card title="Top Overdue Accounts" action={<Link2 href="/overdue" />}><Table head={['Borrower', 'Loan ID', 'Overdue', 'Days Past Due', 'Risk']}>{d.topOverdue.map((o) => <tr key={o.id} className="border-t border-slate-100"><td className="py-2 pr-3 font-medium">{o.borrower}</td><td className="pr-3">{o.loan}</td><td className="pr-3">{inr(o.overdue)}</td><td className="pr-3 font-semibold text-red-600">{o.dpd}</td><td><Badge value={o.risk} /></td></tr>)}</Table></Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title={<span>EMI Due Today <span className="ml-2 rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{d.dueTodayCount} Accounts</span></span>} action={<Link2 href="/emi/schedule" />}><Table head={['Borrower', 'EMI', 'Status', 'Action']}>{d.dueToday.map((e) => <tr key={e.id} className="border-t border-slate-100"><td className="py-2 pr-3 font-medium">{e.borrower}</td><td className="pr-3">{inr(e.emi)}</td><td className="pr-3"><Badge value={e.status} /></td><td><Button variant="outline" className="!px-2 !py-1" onClick={() => collect(e.id)}>Collect</Button></td></tr>)}</Table></Card>
        <Card title="Collection Agent Performance" action={<Link2 href="/agents/performance" />}><Table head={['Agent', 'Collected', 'Target', 'Achievement']}>{d.agents.map((a) => { const p = parseInt(a.achievement, 10); return <tr key={a.id} className="border-t border-slate-100"><td className="py-2 pr-3 font-medium">{a.name}</td><td className="pr-3">{inr(a.collected)}</td><td className="pr-3">{inr(a.target)}</td><td><span className="flex items-center gap-2"><span className="h-2 w-20 rounded bg-slate-100"><span className="block h-2 rounded" style={{ width: `${Math.min(p, 100)}%`, background: p >= 80 ? '#1E9E6A' : '#2F6FED' }} /></span><b>{a.achievement}</b></span></td></tr>; })}</Table></Card>
        {/* <Card title="Quick Actions"><ul className="divide-y divide-slate-100">{QUICK.map(([t, s, h]) => <li key={t}><Link href={`${B}${h}`} className="flex items-center justify-between py-2.5 hover:bg-slate-50"><span><b className="block text-sm">{t}</b><span className="text-xs text-slate-500">{s}</span></span><ChevronRight size={16} className="text-slate-400" aria-hidden /></Link></li>)}</ul></Card> */}
      </div>
    </>
  );
}
