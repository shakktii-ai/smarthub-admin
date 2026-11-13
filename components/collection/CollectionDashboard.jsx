'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  AlertTriangle, ArrowRight, Banknote, CalendarClock, CheckCircle2, HandCoins, IndianRupee,
  Landmark, Percent, RefreshCw, Repeat, ShieldAlert, Users,
} from 'lucide-react';
import { Badge, Button, Card, ErrorState, PageHeader, PageShell, Spinner, StatCard, cx } from '@/components/ui';
import { useApp } from '@/components/ui/AppContext';
import { collectEmi, getCollectionDashboard, getCollectionAutoPayOverview, reconcilePendingDebits } from '@/services';
import { inr, num } from '@/lib/format';

const B = '/collection-admin';
const icons = [IndianRupee, CalendarClock, CheckCircle2, AlertTriangle, Percent, Users];
// Same trend hues the merchant dashboard commits to: brand blue for demand, green for money in.
const TREND_SERIES = [
  { key: 'Due', color: '#2F6FED' },
  { key: 'Collected', color: '#1E9E6A' },
];

const lakhToINR = (lakh) => {
  const r = (Number(lakh) || 0) * 1e5;
  if (r >= 1e7) return `₹${(r / 1e7).toFixed(1)}Cr`;
  if (r >= 1e5) return `₹${(r / 1e5).toFixed(1)}L`;
  if (r >= 1e3) return `₹${Math.round(r / 1e3)}K`;
  return `₹${Math.round(r)}`;
};

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-xl backdrop-blur">
      <p className="mb-1 text-xs font-bold text-slate-700">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-xs text-slate-600">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.stroke }} />
          {p.dataKey}<b className="ml-auto pl-4 tabular-nums text-slate-800">{lakhToINR(p.value)}</b>
        </p>
      ))}
    </div>
  );
}

function Donut({ data, total, label, money }) {
  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={56} outerRadius={80} paddingAngle={2} stroke="none" cornerRadius={4}>
              {data.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div><p className="text-xl font-extrabold tabular-nums text-slate-900">{money ? inr(total) : num(total)}</p><p className="text-xs text-slate-500">{label}</p></div>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2 text-sm">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
            <span className="truncate text-slate-600">{d.name}</span>
            <b className="ml-auto pl-3 tabular-nums text-slate-800">{money ? inr(d.value) : num(d.value)}</b>
            {d.share && <span className="shrink-0 text-xs text-slate-400">{d.share}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

const ViewAll = ({ href }) => (
  <Link href={`${B}${href}`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand transition-colors hover:text-blue-700">
    View All <ArrowRight size={14} aria-hidden />
  </Link>
);
const THead = ({ head }) => (
  <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
    <tr>{head.map((h) => <th key={h} className="py-2 pr-3 font-semibold">{h}</th>)}</tr>
  </thead>
);
const EmptyRow = ({ span, text }) => <tr><td colSpan={span} className="py-8 text-center text-sm text-slate-500">{text}</td></tr>;

export default function CollectionDashboard() {
  const { toast } = useApp();
  const router = useRouter();
  const [d, setD] = useState(null);
  const [autoPay, setAutoPay] = useState({ plans: [], pendingDebits: [], aging: [], restricted: false });
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reconciling, setReconciling] = useState(false);

  const load = useCallback(async () => {
    setErr(false);
    setLoading(true);
    try {
      const [dash, ap] = await Promise.all([
        getCollectionDashboard(),
        getCollectionAutoPayOverview().catch(() => ({ plans: [], pendingDebits: [], aging: [], restricted: true })),
      ]);
      setD(dash);
      setAutoPay(ap || { plans: [], pendingDebits: [], aging: [], restricted: false });
    } catch {
      setErr(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const collect = async (accountRef) => {
    if (!accountRef) { toast('Open the collection account to record this EMI receipt.', 'error'); return; }
    try { await collectEmi(accountRef); toast('EMI receipt recorded'); load(); } catch (e) { toast(e.message, 'error'); }
  };

  const runReconcile = async () => {
    setReconciling(true);
    try {
      const report = await reconcilePendingDebits();
      const checked = report?.checked ?? 0;
      const updated = report?.updated ?? 0;
      const pending = report?.still_pending ?? 0;
      toast(`Reconciled ${checked} debit${checked === 1 ? '' : 's'}: ${updated} updated, ${pending} still pending/unknown`);
      await load();
    } catch (e) {
      toast(e.message || 'Unable to reconcile pending debits', 'error');
    } finally {
      setReconciling(false);
    }
  };

  if (err) return <ErrorState onRetry={load} />;
  if (!d) return <Spinner />;

  const maxOverdue = Math.max(...d.topOverdue.map((o) => o.overdue || 0), 1);

  return (
    <PageShell variant="emerald">
      <PageHeader
        chip="Collection Admin"
        chipIcon={HandCoins}
        title="Dashboard"
        subtitle="Track EMI collections, overdue accounts and team performance."
        action={
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand hover:text-brand disabled:opacity-60"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} aria-hidden /> Refresh
          </button>
        }
      />

      {/* Stats — single row, horizontal scroll on narrow screens */}
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
        {d.stats.map((s, i) => <StatCard key={s.label} {...s} icon={icons[i % icons.length]} i={i} style={{ minWidth: '18rem' }} />)}
      </div>

      {/* Trend + aging + loan status */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card
          title="Collection Trend"
          subtitle="Amount due versus collected per day"
          delay={120}
          action={<span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Last {d.trend.length} days</span>}
        >
          <div className="h-64" role="img" aria-label="Area chart of amount due versus collected per day">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.trend} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  {TREND_SERIES.map((s) => (
                    <linearGradient key={s.key} id={`col-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={s.color} stopOpacity={0.03} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
                <YAxis width={46} tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} tickCount={4} tickFormatter={lakhToINR} />
                <Tooltip content={<TrendTooltip />} />
                {TREND_SERIES.map((s) => (
                  <Area key={s.key} type="monotone" dataKey={s.key} stroke={s.color} strokeWidth={2} fill={`url(#col-${s.key})`} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {TREND_SERIES.map((s) => (
              <span key={s.key} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} /> {s.key}
              </span>
            ))}
          </div>
        </Card>

        <Card title="Overdue Aging" subtitle="How long the money has been late" delay={180}>
          <Donut data={d.aging} total={d.totalOverdue} label="Total Overdue" money />
        </Card>

        <Card title="Loan Status" subtitle="Every account on the book" delay={220}>
          <Donut data={d.loanStatus} total={d.totalLoans} label="Total Loans" />
        </Card>
      </div>

      {/* Recent payments + top overdue */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Recent Payments" subtitle="The latest receipts recorded against collections" delay={260} action={<ViewAll href="/payments" />}>
          <div className="shp-scroll -mx-5 overflow-x-auto px-5">
            <table className="w-full text-sm">
              <THead head={['Date & Time', 'Borrower', 'Loan ID', 'Amount', 'Method', 'Status']} />
              <tbody>
                {d.recentPayments.length ? d.recentPayments.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100 transition-colors hover:bg-emerald-50/40 cursor-pointer" onClick={() => router.push(`${B}/payments`)}>
                    <td className="whitespace-nowrap py-2.5 pr-3 text-slate-600">{p.dateTime}</td>
                    <td className="pr-3 font-semibold text-slate-800">{p.borrower}</td>
                    <td className="pr-3 font-mono text-xs text-slate-500">{p.loan}</td>
                    <td className="pr-3 font-bold tabular-nums text-slate-900">{inr(p.amount)}</td>
                    <td className="pr-3 text-slate-600">{p.method}</td>
                    <td><Badge value={p.status} /></td>
                  </tr>
                )) : <EmptyRow span={6} text="No receipt has been recorded against a collection account yet." />}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Top Overdue Accounts" subtitle="The biggest outstanding balances, oldest first by DPD" delay={300} action={<ViewAll href="/overdue" />}>
          <ul className="space-y-3">
            {d.topOverdue.length ? d.topOverdue.map((o, i) => (
              <li key={o.id} className="shp-rise" style={{ animationDelay: `${320 + i * 60}ms` }}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold text-slate-800">
                    {o.borrower} <span className="ml-1 font-mono text-xs font-normal text-slate-400">{o.loan}</span>
                  </p>
                  <p className="shrink-0 text-sm font-bold tabular-nums text-slate-900">{inr(o.overdue)}</p>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <span className="shp-bar block h-full rounded-full bg-gradient-to-r from-[#FF9F1C] to-[#EF4444]" style={{ width: `${Math.round(((o.overdue || 0) / maxOverdue) * 100)}%`, animationDelay: `${340 + i * 60}ms` }} />
                  </span>
                  <span className={cx('shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums', o.dpd >= 90 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700')}>{o.dpd} DPD</span>
                  <Badge value={o.risk} />
                </div>
              </li>
            )) : <li className="grid place-items-center py-8 text-center">
              <div>
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={22} aria-hidden /></span>
                <p className="mt-2 text-sm font-semibold text-slate-700">No account is past due right now.</p>
              </div>
            </li>}
          </ul>
        </Card>
      </div>

      {/* EMI due today + agent performance */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card
          title={<span className="inline-flex items-center gap-2">EMI Due Today <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">{d.dueTodayCount} EMIs</span></span>}
          subtitle="Unpaid installments scheduled for today"
          delay={340}
          action={<ViewAll href="/emi/schedule" />}
        >
          <div className="shp-scroll -mx-5 overflow-x-auto px-5">
            <table className="w-full text-sm">
              <THead head={['Borrower', 'EMI', 'Status', 'Action']} />
              <tbody>
                {d.dueToday.length ? d.dueToday.map((e) => (
                  <tr key={e.id} className="border-t border-slate-100 transition-colors hover:bg-emerald-50/40 cursor-pointer" onClick={() => router.push(`${B}/emi/schedule`)}>
                    <td className="py-2.5 pr-3 font-semibold text-slate-800">{e.borrower}</td>
                    <td className="pr-3 font-bold tabular-nums text-slate-900">{inr(e.emi)}</td>
                    <td className="pr-3"><Badge value={e.status} /></td>
                    <td>
                      {e.account ? (
                        <Button variant="outline" className="!px-2 !py-1" onClick={(ev) => { ev.stopPropagation(); collect(e.account); }}>Collect</Button>
                      ) : (
                        <Link href={`${B}/collections`} onClick={(ev) => ev.stopPropagation()} className="text-xs font-semibold text-brand hover:text-blue-700">Open account</Link>
                      )}
                    </td>
                  </tr>
                )) : <EmptyRow span={4} text="No installment is due today and unpaid." />}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Collection Agent Performance" subtitle="Collected against target in this window" delay={380} action={<ViewAll href="/agents/performance" />}>
          <ul className="space-y-3.5">
            {d.agents.length ? d.agents.map((a, i) => {
              const p = parseInt(a.achievement, 10);
              return (
                <li key={a.id} className="shp-rise" style={{ animationDelay: `${400 + i * 60}ms` }}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-800">{a.name}</p>
                    <p className="shrink-0 text-xs tabular-nums text-slate-500">{inr(a.collected)} <span className="text-slate-400">/ {inr(a.target)}</span></p>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <span className="shp-bar block h-full rounded-full" style={{ width: `${Math.min(p, 100)}%`, background: p >= 80 ? 'linear-gradient(90deg,#1E9E6A,#34D399)' : 'linear-gradient(90deg,#2F6FED,#28C5E8)', animationDelay: `${420 + i * 60}ms` }} />
                    </span>
                    <b className={cx('w-11 shrink-0 text-right text-xs tabular-nums', p >= 80 ? 'text-emerald-600' : 'text-slate-600')}>{a.achievement}</b>
                  </div>
                </li>
              );
            }) : <li className="py-8 text-center text-sm text-slate-500">No agent has collected money or carries an outstanding book in this window.</li>}
          </ul>
        </Card>
      </div>

      {/* AutoPay & workflow health: UPI AutoPay / NACH-eNACH visibility, pending/unknown and reconciliation */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card
          title={<span className="inline-flex items-center gap-2"><Repeat size={16} className="text-brand" aria-hidden /> AutoPay Mandates & Plans</span>}
          subtitle="UPI AutoPay and NACH/e-NACH rails. Mandates activate only on verified/accepted confirmation (UMRN where applicable) — never on page/form completion."
          delay={420}
          action={<ViewAll href="/reports/reconciliation" />}
        >
          {autoPay.restricted ? (
            <p className="text-sm text-slate-500">Mandate and debit details are available to collection supervisors in this environment.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Plans</p>
                  <p className="mt-1 text-lg font-extrabold tabular-nums text-slate-900">{num(autoPay.plans?.length || 0)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">UPI AutoPay</p>
                  <p className="mt-1 text-lg font-extrabold tabular-nums text-slate-900">{num((autoPay.plans || []).filter((p) => /upi/i.test(p.rail || '')).length)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">NACH / e-NACH</p>
                  <p className="mt-1 text-lg font-extrabold tabular-nums text-slate-900">{num((autoPay.plans || []).filter((p) => /nach/i.test(p.rail || '')).length)}</p>
                </div>
              </div>
              <ul className="space-y-2">
                {(autoPay.plans || []).slice(0, 5).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{p.name || p.plan_id || 'Plan'}</p>
                      <p className="text-xs text-slate-500">{p.rail || '—'} · {inr(p.amount)} {p.frequency ? `· ${p.frequency}` : ''}</p>
                    </div>
                    <Badge value={p.status} />
                  </li>
                ))}
                {!(autoPay.plans || []).length && <li className="py-4 text-center text-sm text-slate-500">No mandate plans configured yet.</li>}
              </ul>
            </div>
          )}
        </Card>

        <Card
          title={<span className="inline-flex items-center gap-2"><ShieldAlert size={16} className="text-amber-600" aria-hidden /> Pending / Unknown Debits</span>}
          subtitle="Timeout or missing callback stays PENDING/UNKNOWN (never FAILED). Reconcile against provider status before any retry; never submit a duplicate while pending."
          delay={460}
          action={
            <button
              type="button"
              onClick={runReconcile}
              disabled={reconciling || autoPay.restricted}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
            >
              <RefreshCw size={13} className={reconciling ? 'animate-spin' : ''} aria-hidden /> {reconciling ? 'Reconciling…' : 'Reconcile now'}
            </button>
          }
        >
          {autoPay.restricted ? (
            <p className="text-sm text-slate-500">Pending debit queue and reconciliation are available to collection supervisors.</p>
          ) : (
            <div className="shp-scroll -mx-5 overflow-x-auto px-5">
              <table className="w-full text-sm">
                <THead head={['Debit / Mandate', 'Amount', 'Rail', 'Status', 'Created']} />
                <tbody>
                  {(autoPay.pendingDebits || []).length ? (autoPay.pendingDebits || []).slice(0, 8).map((d2) => (
                    <tr key={d2.id} className="border-t border-slate-100">
                      <td className="py-2.5 pr-3">
                        <p className="font-mono text-xs font-semibold text-slate-700">{d2.id}</p>
                        <p className="text-[11px] text-slate-500">{d2.mandate_id || '—'}</p>
                      </td>
                      <td className="pr-3 font-bold tabular-nums text-slate-900">{inr(d2.amount)}</td>
                      <td className="pr-3 text-slate-600">{d2.rail || '—'}</td>
                      <td className="pr-3"><Badge value={d2.status} /></td>
                      <td className="whitespace-nowrap pr-3 text-xs text-slate-500">{d2.created_at || '—'}</td>
                    </tr>
                  )) : <EmptyRow span={5} text="No pending/unknown debits in the reconciliation window." />}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-slate-500">Terminal outcomes (success/failure) come only from confirmed partner status. Instruction submitted ≠ debited ≠ settled.</p>
            </div>
          )}
        </Card>

        <Card
          title={<span className="inline-flex items-center gap-2"><Landmark size={16} className="text-emerald-700" aria-hidden /> Workflow & Reconciliation Health</span>}
          subtitle="End-to-end lending & collection: mandate activation, EMI schedule execution, receipts, DPD aging and three-way reconciliation controls."
          delay={500}
          action={<ViewAll href="/reports/collection" />}
        >
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-brand"><Repeat size={15} /></span>
              <div className="min-w-0"><p className="font-semibold text-slate-800">UPI AutoPay</p><p className="text-xs text-slate-600">Register → verified partner confirmation/status enquiry activates. Recurring debit via scheduler with global lock; no parallel duplicate rail execution.</p></div>
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700"><Banknote size={15} /></span>
              <div className="min-w-0"><p className="font-semibold text-slate-800">NACH / e-NACH</p><p className="text-xs text-slate-600">e-mandate registration → activate only on accepted status and UMRN (where applicable). File/API execution follows sponsor-bank cut-offs, clearing calendar and return codes.</p></div>
            </li>
            <li className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-700"><AlertTriangle size={15} /></span>
              <div className="min-w-0"><p className="font-semibold text-slate-800">Controls</p><p className="text-xs text-slate-600">Never duplicate debit · never treat unknown as failure · never debit without valid accepted mandate/authorization · ledger + partner + bank settlement three-way reconciliation.</p></div>
            </li>
            <li className="flex flex-wrap gap-2 pt-1">
              <Link href={`${B}/payments/failed`} className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100">Failed payments <ArrowRight size={12} /></Link>
              <Link href={`${B}/overdue/aging`} className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100">DPD aging <ArrowRight size={12} /></Link>
              <Link href={`${B}/collections/followups`} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100">Follow-ups <ArrowRight size={12} /></Link>
            </li>
          </ul>
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Aging buckets (live)</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(autoPay.aging || []).length ? (autoPay.aging || []).map((a) => (
                <span key={a.bucket} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  <span className="font-semibold">{a.bucket}</span><span className="text-slate-500">{num(a.accounts)} accts</span><span className="font-semibold tabular-nums">{inr(a.amount)}</span>
                </span>
              )) : <span className="text-xs text-slate-500">No aging data available.</span>}
            </div>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
