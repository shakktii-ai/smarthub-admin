"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  ClipboardCheck,
  IndianRupee,
  Landmark,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Store,
  AlertTriangle,
} from "lucide-react";
import {
  Badge,
  Card,
  ErrorState,
  PageHeader,
  PageShell,
  RecordDetails,
  Spinner,
  StatCard,
  StatsRow,
  TableRow,
} from "@/components/ui";
import ServiceHealthStrip from "@/components/superadmin/ServiceHealth";
import { ROLE_LABELS } from "@/config/auth";
import { getSuperAdminDashboard } from "@/services";
import { listDashboardAdmins } from "@/app/super-admin/users/actions";
import { fmtDate, inr, num } from "@/lib/format";

const icons = [IndianRupee, Store, Landmark, ClipboardCheck, ShieldAlert, AlertTriangle];
const ViewAll = ({ href }) => (
  <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-brand transition-colors hover:text-blue-700">
    View All <ArrowRight size={14} aria-hidden />
  </Link>
);

// Same separable hues the merchant dashboard charts commit to, so the suite reads as one product.
const VOL_SERIES = [
  { key: "UPI", color: "#2F6FED" },
  { key: "Card", color: "#1E9E6A" },
  { key: "QR", color: "#FF9F1C" },
  { key: "Others", color: "#94A3B8" },
];

const compactINR = (rupees) => {
  const r = Number(rupees) || 0;
  if (r >= 1e7) return `₹${(r / 1e7).toFixed(1)}Cr`;
  if (r >= 1e5) return `₹${(r / 1e5).toFixed(1)}L`;
  if (r >= 1e3) return `₹${Math.round(r / 1e3)}K`;
  return `₹${Math.round(r)}`;
};
// The backend sends either "Oct 05, 2026" or an ISO day; both label the axis as "Oct 05".
const dayLabel = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? fmtDate(d).replace(/, \d{4}$/, "") : d);

function VolumeTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-xl backdrop-blur">
      <p className="mb-1 text-xs font-bold text-slate-700">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-xs text-slate-600">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.stroke }} />
          {p.dataKey}<b className="ml-auto pl-4 tabular-nums text-slate-800">{inr(p.value)}</b>
        </p>
      ))}
    </div>
  );
}

function Donut({ data }) {
  const total = (data || []).reduce((s, d) => s + (Number(d.value) || 0), 0);
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
          <div><p className="text-2xl font-extrabold tabular-nums text-slate-900">{num(total)}</p><p className="text-xs text-slate-500">Admins</p></div>
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

const THead = ({ head }) => (
  <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
    <tr>{head.map((h) => <th key={h} className="py-2 pr-3 font-semibold">{h}</th>)}</tr>
  </thead>
);

export default function SuperAdminDashboard() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setErr(false);
    setLoading(true);
    Promise.all([
      getSuperAdminDashboard(),
      // Reads the user directory straight from the backend; when that call fails
      // (mock mode, a hiccup) the dashboard payload carries the same shape, so
      // the card falls back to it instead of sinking the whole page.
      listDashboardAdmins().catch(() => null),
    ])
      .then(([dashboard, admins]) => {
        setD(admins?.error || !admins ? dashboard : { ...dashboard, admins: admins.rows });
      })
      .catch(() => setErr(true))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  if (err) return <ErrorState onRetry={load} />;
  if (!d) return <Spinner />;

  const volTotal = (d.volume || []).reduce((s, v) => s + (Number(v.total) || 0), 0);
  const volume = (d.volume || []).map((v) => ({ ...v, day: dayLabel(v.date) }));

  return (
    <PageShell variant="violet">
      <PageHeader
        chip="Super Admin"
        chipIcon={ShieldCheck}
        title="Dashboard"
        subtitle="Platform-wide view across Merchant, Collect and UPI, plus approvals, risk and access control."
        action={
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-brand hover:text-brand disabled:opacity-60"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} aria-hidden /> Refresh
          </button>
        }
      />

      {/* Stats — single row, horizontal scroll on narrow screens */}
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
        {d.stats.map((s, i) => <StatCard key={s.label} {...s} icon={icons[i % icons.length]} i={i} style={{ minWidth: '18rem' }} />)}
      </div>

      <ServiceHealthStrip />

      {/* Payment volume + admin distribution */}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card
          title="Payment Volume"
          subtitle="Last 7 days by payment method"
          className="xl:col-span-2"
          delay={120}
          action={<span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold tabular-nums text-violet-700">{compactINR(volTotal)}</span>}
        >
          {volume.length ? (
            <div className="h-72" role="img" aria-label="Stacked area chart of payment volume by method">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volume} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    {VOL_SERIES.map((s) => (
                      <linearGradient key={s.key} id={`sa-vol-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={s.color} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={s.color} stopOpacity={0.03} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={28} />
                  <YAxis width={46} tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} tickCount={4} tickFormatter={compactINR} />
                  <Tooltip content={<VolumeTooltip />} />
                  {VOL_SERIES.map((s) => (
                    <Area key={s.key} type="monotone" dataKey={s.key} stackId="a" stroke={s.color} strokeWidth={2} fill={`url(#sa-vol-${s.key})`} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="grid h-72 place-items-center text-sm text-slate-500">No payment volume recorded in this window yet.</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {VOL_SERIES.map((s) => (
              <span key={s.key} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} /> {s.key}
              </span>
            ))}
          </div>
        </Card>

        <Card title="Admin Users by Dashboard" subtitle="Who holds the keys to each section" delay={180}>
          <Donut data={d.rolesDist} />
        </Card>
      </div>

      {/* Administrators + maker-checker queue */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Administrators" subtitle="Platform staff with admin access" delay={220} action={<ViewAll href="/super-admin/users" />}>
          <div className="shp-scroll -mx-5 overflow-x-auto px-5">
            <table className="w-full text-sm">
              <THead head={["Name", "Role", "Branch", "Status"]} />
              <tbody>
                {d.admins.map((admin) => (
                  <tr key={admin.id} className="border-t border-slate-100 transition-colors hover:bg-violet-50/40 cursor-pointer" onClick={() => router.push(`/super-admin/users/${admin.id}`)}>
                    <td className="py-2.5 pr-3 font-semibold text-slate-800">{admin.full_name || "-"}</td>
                    <td className="pr-3 text-slate-600">{ROLE_LABELS[admin.role] || admin.role}</td>
                    <td className="pr-3 text-slate-600">{admin.branch?.name || "-"}</td>
                    <td className="pr-3"><Badge value={admin.is_active ? "Active" : "Suspended"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Maker-Checker Queue" subtitle="Sensitive changes awaiting a second pair of eyes" delay={260} action={<ViewAll href="/super-admin/maker-checker" />}>
          <div className="shp-scroll -mx-5 overflow-x-auto px-5">
            <table className="w-full text-sm">
              <THead head={["Action", "Target", "Maker", "Requested", "Status"]} />
              <tbody>
                {d.pending?.length ? d.pending.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100 transition-colors hover:bg-violet-50/40 cursor-pointer" onClick={() => router.push(`/super-admin/maker-checker/${p.id}`)}>
                    <td className="py-2.5 pr-3 font-semibold text-slate-800">{p.action}</td>
                    <td className="pr-3 text-slate-600">{p.target}</td>
                    <td className="pr-3 text-slate-600">{p.maker}</td>
                    <td className="whitespace-nowrap pr-3 text-slate-600">{p.requestedOn}</td>
                    <td><Badge value={p.status} /></td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="py-8 text-center text-sm text-slate-500">No maker-checker request is waiting right now.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Recent audit events */}
      <Card title="Recent Audit Events" subtitle="Every sensitive action, who took it and what changed" delay={300} action={<ViewAll href="/super-admin/audit-logs" />}>
        <div className="shp-scroll -mx-5 overflow-x-auto px-5">
          <table className="w-full text-sm">
            <THead head={["Time", "User", "Action", "Entity", "Change"]} />
            <tbody>
              {d.audit.map((a) => (
                <tr key={a.id || `${a.time}-${a.user}-${a.action}`} className="border-t border-slate-100 transition-colors hover:bg-violet-50/40 cursor-pointer" onClick={() => router.push(`/super-admin/audit-logs/${a.id || a.time}`)}>
                  <td className="whitespace-nowrap py-2.5 pr-3 text-slate-600">{a.time}</td>
                  <td className="pr-3 font-semibold text-slate-800">{a.user}</td>
                  <td className="pr-3 text-slate-600">{a.action}</td>
                  <td className="whitespace-nowrap pr-3 text-slate-600">{a.entity}</td>
                  <td className="max-w-72 truncate pr-3 text-slate-500" title={a.change}>{a.change}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PageShell>
  );
}
