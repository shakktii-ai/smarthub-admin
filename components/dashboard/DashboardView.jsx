'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  ArrowRight, CheckCircle2, Clock, IndianRupee, RefreshCw, Store, TrendingDown, TrendingUp, Sparkles,
} from 'lucide-react';
import { Badge, ErrorState, Spinner, STAT_THEME, Spark, cx } from '@/components/ui';
import { getDashboard, getRecentFeeds } from '@/services';
import { inr, num } from '@/lib/format';

const icons = [Store, CheckCircle2, Clock, IndianRupee];

// Six separable chart hues (luminance + hue), reused by bars, donut and legend.
const CAT_COLORS = ['#2F6FED', '#1E9E6A', '#FF9F1C', '#8B5CF6', '#28C5E8', '#94A3B8'];
const VOL_SERIES = [
  { key: 'UPI',    color: '#2F6FED' },
  { key: 'Card',   color: '#1E9E6A' },
  { key: 'QR',     color: '#FF9F1C' },
  { key: 'Others', color: '#94A3B8' },
];
const RANK = ['from-[#F59E0B] to-[#FBBF24] text-white', 'from-[#94A3B8] to-[#CBD5E1] text-white', 'from-[#B45309] to-[#D97706] text-white'];

const clampPct = (p) => Math.min(100, Math.max(0, Number(p) || 0));

// d.volume is stored in ₹ lakh; render axis/tooltips in the shortest readable unit
// so tiny real-world totals don't produce long clipped decimals like 0.0075L.
const compactINR = (rupees) => {
  const r = Number(rupees) || 0;
  if (r >= 1e7) return `₹${(r / 1e7).toFixed(1)}Cr`;
  if (r >= 1e5) return `₹${(r / 1e5).toFixed(1)}L`;
  if (r >= 1e3) return `₹${Math.round(r / 1e3)}K`;
  return `₹${Math.round(r)}`;
};
const lakhToINR = (lakh) => compactINR((Number(lakh) || 0) * 1e5);

function StatCard({ s, i }) {
  const t = STAT_THEME[s.color] || STAT_THEME.blue;
  const Icon = icons[i] || Store;
  return (
    <div
      className="shp-rise group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      style={{ animationDelay: `${i * 70}ms`, boxShadow: `0 1px 2px rgba(15,36,64,.06), 0 12px 32px -18px ${t.glow}` }}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl transition-opacity opacity-70 group-hover:opacity-100" style={{ background: t.glow }} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-slate-500">{s.label}</p>
          <p className="mt-1.5 truncate text-[26px] font-extrabold tracking-tight text-slate-900 tabular-nums" title={s.value}>{s.value}</p>
        </div>
        <span className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-lg', t.grad)}>
          <Icon size={20} aria-hidden />
        </span>
      </div>
      <div className="relative mt-3 flex items-end justify-between gap-3">
        {s.delta ? (
          <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', s.up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600')}>
            {s.up ? <TrendingUp size={12} aria-hidden /> : <TrendingDown size={12} aria-hidden />}
            {s.delta}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: t.spark }} /><span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: t.spark }} /></span>
            live
          </span>
        )}
        <div className="w-24 shrink-0"><Spark color={t.spark} seed={i} /></div>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, action, children, className, delay = 0 }) {
  return (
    <section className={cx('shp-rise relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm', className)} style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="grow p-5">{children}</div>
    </section>
  );
}

const ViewAll = ({ href }) => (
  <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-brand transition-colors hover:text-blue-700">
    View All <ArrowRight size={14} aria-hidden />
  </Link>
);

function VolumeTooltip({ active, payload, label }) {
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

function Donut({ data, total, label }) {
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
          <div><p className="text-2xl font-extrabold tabular-nums text-slate-900">{num(total)}</p><p className="text-xs text-slate-500">{label}</p></div>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2 text-sm">
        {data.map((d) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
            <span className="truncate text-slate-600">{d.name}</span>
            <b className="ml-auto pl-3 tabular-nums text-slate-800">{num(d.value)}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DashboardView({ data: seed = null, feeds: seedFeeds = null }) {
  const router = useRouter();
  const [d, setD] = useState(seed);
  const [feeds, setFeeds] = useState(seedFeeds);
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(!seed);

  const load = useCallback(() => {
    setErr(false); setLoading(true);
    Promise.all([getDashboard(), getRecentFeeds()])
      .then(([a, b]) => { setD(a); setFeeds(b); })
      .catch(() => setErr(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { if (!seed || !seedFeeds) load(); }, [seed, seedFeeds, load]);

  if (err) return <ErrorState onRetry={load} />;
  if (!d || !feeds) return <Spinner />;

  const pendTotal = d.onboarding.reduce((s, x) => s + x.value, 0);
  const volTotal = d.volume.reduce((s, v) => s + VOL_SERIES.reduce((a, x) => a + (Number(v[x.key]) || 0), 0), 0);
  const maxMerchant = Math.max(...d.topMerchants.map((m) => m[2] || 0), 1);

  return (
    <div className="shp-dash relative">
      {/* Layered ambient background */}
      <div className="pointer-events-none absolute inset-0 -m-4 overflow-hidden sm:-m-5 lg:-m-6" aria-hidden>
        <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-[#2F6FED]/10 blur-3xl" />
        <div className="absolute top-40 -left-24 h-72 w-72 rounded-full bg-[#28C5E8]/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-[#8B5CF6]/10 blur-3xl" />
      </div>

      <div className="relative space-y-5">
        {/* Header */}
        <div className="shp-rise flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-brand">
              <Sparkles size={12} aria-hidden /> Merchant Admin
            </span>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
              Dashboard<span className="text-gradient">.</span>
            </h1>
            <p className="mt-1 text-sm text-slate-600">Overview of merchant network, payments and settlements.</p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand hover:text-brand disabled:opacity-60"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} aria-hidden /> Refresh
          </button>
        </div>

        {/* Stats — single row, horizontal scroll on narrow screens */}
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
          {d.stats.map((s, i) => <StatCard key={s.label} s={s} i={i} style={{ minWidth: '18rem' }} />)}
        </div>

        {/* Volume + onboarding pipeline */}
        <div className="grid gap-4 xl:grid-cols-3">
          <Panel
            title="Transaction Volume" subtitle="Last 14 days by payment method"
            className="xl:col-span-2" delay={120}
            action={<span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold tabular-nums text-brand">{lakhToINR(volTotal)}</span>}
          >
            {d.volume.length ? (
              <div className="h-72" role="img" aria-label="Stacked area chart of transaction volume by payment method">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={d.volume} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      {VOL_SERIES.map((s) => (
                        <linearGradient key={s.key} id={`vol-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={s.color} stopOpacity={0.03} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={28} />
                    <YAxis width={46} tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} tickCount={4} tickFormatter={lakhToINR} />
                    <Tooltip content={<VolumeTooltip />} />
                    {VOL_SERIES.map((s) => (
                      <Area key={s.key} type="monotone" dataKey={s.key} stackId="a" stroke={s.color} strokeWidth={2} fill={`url(#vol-${s.key})`} />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="grid h-72 place-items-center text-sm text-slate-500">No transactions recorded in this window yet.</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {VOL_SERIES.map((s) => (
                <span key={s.key} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} /> {s.key}
                </span>
              ))}
            </div>
          </Panel>

          <Panel title="Onboarding Pipeline" subtitle="Merchants awaiting a decision" delay={180}>
            {d.onboarding.length ? (
              <Donut data={d.onboarding} total={pendTotal} label="Total Pending" />
            ) : (
              <div className="grid h-44 place-items-center text-center">
                <div>
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 size={22} aria-hidden /></span>
                  <p className="mt-2 text-sm font-semibold text-slate-700">All onboarding settled</p>
                  <p className="text-xs text-slate-500">No merchant is waiting on a decision.</p>
                </div>
              </div>
            )}
          </Panel>
        </div>

        {/* Categories + top merchants */}
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Top Merchant Categories" subtitle="Share of onboarded merchants" delay={220}>
            <ul className="space-y-4">
              {d.categories.map(([n, p], i) => (
                <li key={n} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0 truncate font-medium text-slate-700" title={n}>{n}</span>
                  <span className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <span className="shp-bar block h-full rounded-full" style={{ width: `${clampPct(p)}%`, background: `linear-gradient(90deg, ${CAT_COLORS[i % CAT_COLORS.length]}, ${CAT_COLORS[i % CAT_COLORS.length]}cc)`, animationDelay: `${240 + i * 60}ms` }} />
                  </span>
                  <b className="w-14 shrink-0 text-right tabular-nums text-slate-800">{p}%</b>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Top Merchants by Transaction Volume" delay={260} action={<ViewAll href="/merchant-admin/merchants" />}>
            <ul className="space-y-3">
              {d.topMerchants.map(([n, t, v], i) => (
                <li key={n} className="flex items-center gap-3">
                  <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-xs font-extrabold', RANK[i] || 'from-slate-100 to-slate-200 text-slate-600')}>{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-slate-800">{n}</p>
                      <p className="text-sm font-bold tabular-nums text-slate-900">{inr(v)}</p>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <span className="shp-bar block h-full rounded-full bg-gradient-to-r from-[#2F6FED] to-[#28C5E8]" style={{ width: `${Math.round(((v || 0) / maxMerchant) * 100)}%`, animationDelay: `${280 + i * 60}ms` }} />
                      </span>
                      <span className="shrink-0 text-xs tabular-nums text-slate-500">{num(t)} txns</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        {/* Device fleet health (D15): getDashboard already aggregates device counts by status. */}
        {Array.isArray(d.devices) && d.devices.length > 0 && (
          <Panel title="Device Fleet" subtitle="Paired devices by status" delay={300}>
            <ul className="space-y-2">
              {d.devices.map((x, i) => (
                <li key={x.name} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{x.name}</span>
                  <b className="tabular-nums text-slate-900">{num(x.value)}</b>
                </li>
              ))}
            </ul>
          </Panel>
        )}
        {/* Feeds */}
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="Recent Merchant Onboardings" delay={300} action={<ViewAll href="/merchant-admin/merchants/onboarding" />}>
            <div className="shp-scroll -mx-5 overflow-x-auto px-5">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="py-2 pr-3 font-semibold">Merchant</th><th className="pr-3 font-semibold">Category</th><th className="pr-3 font-semibold">Sales Staff</th><th className="pr-3 font-semibold">KYC Status</th><th className="font-semibold">Date</th></tr>
                </thead>
                <tbody>
                  {feeds.onboardings.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 transition-colors hover:bg-blue-50/40 cursor-pointer" onClick={() => router.push(`/merchant-admin/merchants/onboarding/${r.id}`)}>
                      <td className="py-2.5 pr-3 font-semibold text-slate-800">{r.merchant}</td>
                      <td className="pr-3 text-slate-600">{r.category}</td>
                      <td className="pr-3 text-slate-600">{r.salesStaff}</td>
                      <td className="pr-3"><Badge value={r.status} /></td>
                      <td className="whitespace-nowrap text-slate-600">{r.appliedOn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Latest Transactions" delay={340} action={<ViewAll href="/merchant-admin/transactions" />}>
            <div className="shp-scroll -mx-5 overflow-x-auto px-5">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="py-2 pr-3 font-semibold">Txn ID</th><th className="pr-3 font-semibold">Merchant</th><th className="pr-3 font-semibold">Amount</th><th className="pr-3 font-semibold">Method</th><th className="font-semibold">Status</th></tr>
                </thead>
                <tbody>
                  {feeds.transactions.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 transition-colors hover:bg-blue-50/40 cursor-pointer" onClick={() => router.push(`/merchant-admin/transactions/${r.id}`)}>
                      <td className="py-2.5 pr-3 font-mono text-xs text-slate-500">{r.id}</td>
                      <td className="pr-3 font-semibold text-slate-800">{r.merchant}</td>
                      <td className="pr-3 font-bold tabular-nums text-slate-900">{inr(r.amount)}</td>
                      <td className="pr-3 text-slate-600">{r.method}</td>
                      <td><Badge value={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}