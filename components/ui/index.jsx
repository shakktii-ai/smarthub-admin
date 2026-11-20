'use client';
import { useEffect, useMemo } from 'react';
import { X, Loader2, Inbox, AlertTriangle, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';

export const cx = (...a) => a.filter(Boolean).join(' ');

// ---------------------------------------------------------------------------
// Shared visual language of the admin suite (born on the merchant dashboard):
// one committed hue family per stat, carried through icon, glow, chip and spark.
// ---------------------------------------------------------------------------
export const STAT_THEME = {
  blue:   { grad: 'from-[#2F6FED] to-[#28C5E8]', spark: '#2F6FED', glow: 'rgba(47,111,237,0.16)',  chip: 'bg-blue-50 text-blue-700' },
  green:  { grad: 'from-[#1E9E6A] to-[#34D399]', spark: '#1E9E6A', glow: 'rgba(30,158,106,0.16)',  chip: 'bg-emerald-50 text-emerald-700' },
  amber:  { grad: 'from-[#FF9F1C] to-[#FBBF24]', spark: '#FF9F1C', glow: 'rgba(255,159,28,0.18)',  chip: 'bg-amber-50 text-amber-700' },
  purple: { grad: 'from-[#8B5CF6] to-[#D946EF]', spark: '#8B5CF6', glow: 'rgba(139,92,246,0.16)',  chip: 'bg-violet-50 text-violet-700' },
  red:    { grad: 'from-[#EF4444] to-[#F87171]', spark: '#EF4444', glow: 'rgba(239,68,68,0.14)',   chip: 'bg-red-50 text-red-600' },
};

// Decorative trend line, deterministic per card so re-renders are stable.
export function Spark({ color, seed = 0 }) {
  const pts = useMemo(() => {
    const base = [4, 9, 6, 12, 8, 14, 10, 16, 13, 19];
    return base.map((v, i) => `${i * 11},${24 - (v + ((seed * 3 + i * 5) % 4))}`).join(' ');
  }, [seed]);
  return (
    <svg viewBox="0 0 99 26" className="h-6 w-full" preserveAspectRatio="none" aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Page shell: layered ambient background (bled into the layout padding) plus a
// rise-in staggered stack, the frame every dashboard and list page sits in.
// ---------------------------------------------------------------------------
const AMBIENT = {
  brand:   ['bg-[#2F6FED]/10', 'bg-[#28C5E8]/10', 'bg-[#8B5CF6]/10'],
  emerald: ['bg-[#1E9E6A]/10', 'bg-[#28C5E8]/10', 'bg-[#2F6FED]/10'],
  violet:  ['bg-[#8B5CF6]/10', 'bg-[#2F6FED]/10', 'bg-[#28C5E8]/10'],
};

export function PageShell({ variant = 'brand', className = '', children }) {
  const blobs = AMBIENT[variant] || AMBIENT.brand;
  return (
    <div className={cx('relative', className)}>
      <div className="pointer-events-none absolute inset-0 -m-4 overflow-hidden sm:-m-5 lg:-m-6" aria-hidden>
        <div className={cx('absolute -top-24 right-0 h-72 w-72 rounded-full blur-3xl', blobs[0])} />
        <div className={cx('absolute top-40 -left-24 h-72 w-72 rounded-full blur-3xl', blobs[1])} />
        <div className={cx('absolute bottom-0 right-1/4 h-72 w-72 rounded-full blur-3xl', blobs[2])} />
      </div>
      <div className="relative space-y-5">{children}</div>
    </div>
  );
}

// Gradient-dotted page title with a section chip, the header every page opens with.
export function PageHeader({ chip, chipIcon: ChipIcon = Sparkles, title, subtitle, action, delay = 0 }) {
  const chipTone = chip === 'Collection Admin'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : chip === 'Super Admin'
      ? 'border-violet-200 bg-violet-50 text-violet-700'
      : 'border-blue-200 bg-blue-50 text-brand';
  return (
    <div className="shp-rise flex flex-wrap items-end justify-between gap-3" style={{ animationDelay: `${delay}ms` }}>
      <div>
        {chip && (
          <span className={cx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide', chipTone)}>
            {ChipIcon && <ChipIcon size={12} aria-hidden />} {chip}
          </span>
        )}
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
          {title}<span className="text-gradient">.</span>
        </h1>
        {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Primitives (same props as before, new skin)
// ---------------------------------------------------------------------------

export function Card({ title, subtitle, action, children, className = '', delay = 0 }) {
  // No overflow-hidden here: some cards hold filter dropdowns that must be able
  // to drop below the card's edge (AuditTrail, ApprovalQueue, RiskCenter).
  return (
    <section
      className={cx('shp-rise relative flex flex-col rounded-2xl border border-slate-200/80 bg-white shadow-sm', className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {(title || action || subtitle) && (
        <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className="grow p-5">{children}</div>
    </section>
  );
}

export function StatsRow({ children }) {
  return <div className="shp-scroll grid min-w-0 grid-flow-col auto-cols-[minmax(11rem,1fr)] gap-4 overflow-x-auto py-2" aria-label="Page statistics">{children}</div>;
}

export function TableRow({ onOpen, className, children, ...props }) {
  return (
    <tr
      {...props}
      tabIndex={onOpen ? 0 : undefined}
      className={cx(className, onOpen && 'cursor-pointer transition-colors hover:bg-blue-50/50 focus-visible:bg-blue-50')}
      onClick={(event) => {
        if (!onOpen || event.defaultPrevented || event.target.closest('a, button, input, select, textarea, label, summary, [role="button"], [role="link"], [contenteditable="true"]')) return;
        if (window.getSelection()?.toString()) return;
        onOpen();
      }}
      onKeyDown={(event) => {
        if (onOpen && event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      {children}
    </tr>
  );
}

export function StatCard({ label, value, delta, up = true, color = 'blue', icon: Icon, i = 0 }) {
  const t = STAT_THEME[color] || STAT_THEME.blue;
  return (
    <div
      className="shp-rise group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      style={{ animationDelay: `${i * 70}ms`, boxShadow: `0 1px 2px rgba(15,36,64,.06), 0 12px 32px -18px ${t.glow}` }}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl transition-opacity opacity-70 group-hover:opacity-100" style={{ background: t.glow }} aria-hidden />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-slate-500">{label}</p>
          <p className="mt-1.5 truncate text-[26px] font-extrabold tracking-tight text-slate-900 tabular-nums" title={String(value)}>{value}</p>
        </div>
        {Icon && <span className={cx('grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-lg', t.grad)}><Icon size={20} aria-hidden /></span>}
      </div>
      <div className="relative mt-3 flex items-end justify-between gap-3">
        {delta ? (
          <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', up ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600')}>
            {up ? <TrendingUp size={12} aria-hidden /> : <TrendingDown size={12} aria-hidden />}
            {delta}
          </span>
        ) : null}
      </div>
    </div>
  );
}

const tones = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
  red: 'bg-red-50 text-red-600 ring-red-600/10',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/10',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/10',
  purple: 'bg-violet-50 text-violet-700 ring-violet-600/10',
  gray: 'bg-slate-100 text-slate-600 ring-slate-500/10',
};
const map = { Success: 'green', 'Pending KYC': 'amber', Suspended: 'red', Accepted: 'green', Published: 'green', Balanced: 'green', Pending: 'amber', Due: 'amber', Paid: 'green', Overdue: 'red', Upcoming: 'blue', 'High Risk': 'red', Medium: 'amber', Low: 'green', Scheduled: 'blue', Missed: 'red', Kept: 'green', Broken: 'red', NPA: 'red', Closed: 'gray', 'Pending Documents': 'amber', Disbursed: 'green', Promised: 'blue', Escalated: 'red', Reassigned: 'gray', 'Action Needed': 'red', Monitor: 'amber', Verified: 'green', Valid: 'green', Uploaded: 'blue', Invalid: 'red', 'Re-upload': 'amber', Draft: 'gray', Completed: 'green', Active: 'green', Approved: 'green', Online: 'green', Paid: 'green', Resolved: 'green', Read: 'gray', 'Expired': 'red', 'Live now': 'green', 'Scheduled': 'blue', 'Archived': 'gray', Deployed: 'green', Failed: 'red', Rejected: 'red', Offline: 'red', Exception: 'red', Open: 'red', Unread: 'blue', Refunded: 'purple', Returned: 'purple', 'Under Review': 'amber', 'KYC Pending': 'amber', 'In Review': 'amber', 'On Leave': 'amber', 'In Stock': 'blue', 'Document Review': 'blue', 'Bank Verification': 'blue', 'In Progress': 'blue', P1: 'red', P2: 'amber', P3: 'blue', P4: 'gray', High: 'red', Critical: 'red', Acknowledged: 'amber', Dismissed: 'gray', Inactive: 'gray' };
export function Badge({ value }) { return <span className={cx('inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', tones[map[value] || 'gray'])}>{value}</span>; }

export function Button({ variant = 'primary', className = '', ...p }) {
  const v = {
    primary: 'bg-gradient-to-b from-[#3B7BF5] to-[#2F6FED] text-white shadow-sm hover:from-[#2F6FED] hover:to-[#2558C4] active:scale-[.98]',
    outline: 'border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-brand hover:text-brand active:scale-[.98]',
    danger: 'bg-gradient-to-b from-[#F05252] to-[#DC2626] text-white shadow-sm hover:from-[#EF4444] hover:to-[#C02020] active:scale-[.98]',
  };
  return <button type="button" {...p} className={cx('inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50', v[variant], className)} />;
}

export const Spinner = () => (
  <div role="status" className="shp-pop flex flex-col items-center justify-center gap-3 p-14 text-slate-400">
    <span className="relative flex h-10 w-10">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand/15" />
      <Loader2 className="relative animate-spin text-brand" size={26} aria-hidden />
    </span>
    <p className="text-sm font-medium">Loading…</p>
  </div>
);
export const EmptyState = ({ text = 'No records match your filters.' }) => (
  <div className="shp-pop flex flex-col items-center gap-3 p-12 text-slate-400">
    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200/60 text-slate-400"><Inbox size={26} aria-hidden /></span>
    <p className="text-sm font-medium text-slate-500">{text}</p>
  </div>
);
export const ErrorState = ({ onRetry }) => (
  <div role="alert" className="shp-pop flex flex-col items-center gap-3 rounded-2xl border border-red-100 bg-red-50/50 p-12 text-red-500">
    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-red-100 to-red-200/70 text-red-500"><AlertTriangle size={26} aria-hidden /></span>
    <p className="text-sm font-semibold text-red-600">Something went wrong while loading data.</p>
    <Button variant="outline" onClick={onRetry}>Retry</Button>
  </div>
);

function useEsc(onClose) {
  useEffect(() => { const h = (e) => e.key === 'Escape' && onClose(); document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h); }, [onClose]);
}

export function Drawer({ title, onClose, children }) {
  useEsc(onClose);
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="shp-pop h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 mb-4 flex items-center justify-between border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur"><h2 className="text-lg font-bold text-slate-900">{title}</h2><button aria-label="Close" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"><X size={18} /></button></div>
        <div className="px-5 pb-5">{children}</div>
      </aside>
    </div>
  );
}

export function RecordDetails({ title, entries, onClose }) {
  return (
    <Drawer title={title} onClose={onClose}>
      <dl className="divide-y divide-slate-100 text-sm">
        {entries.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-2">
            <dt className="shrink-0 text-slate-500">{label}</dt>
            <dd className="min-w-0 whitespace-pre-wrap break-words text-right font-medium">{value ?? '—'}</dd>
          </div>
        ))}
      </dl>
    </Drawer>
  );
}

export function Modal({ title, onClose, children }) {
  useEsc(onClose);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="shp-pop w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <h2 className="mb-3 text-lg font-bold text-slate-900">{title}</h2>{children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger, busy, onConfirm, onCancel }) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="mb-5 text-sm text-slate-600">{message}</p>
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={onCancel}>Cancel</Button><Button variant={danger ? 'danger' : 'primary'} disabled={busy} onClick={onConfirm}>{busy ? 'Working…' : confirmLabel}</Button></div>
    </Modal>
  );
}

export function Pagination({ page, total, pageSize, onPage }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const list = [...new Set([1, page - 1, page, page + 1, pages].filter((p) => p >= 1 && p <= pages))].sort((a, b) => a - b);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-sm text-slate-500">
      <span className="tabular-nums">Showing {total === 0 ? 0 : (page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} of {total.toLocaleString('en-IN')}</span>
      <nav aria-label="Pagination" className="flex items-center gap-1">
        <button className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:pointer-events-none disabled:opacity-40" disabled={page === 1} onClick={() => onPage(page - 1)} aria-label="Previous page">‹</button>
        {list.map((p, i) => <span key={p} className="flex items-center">{i > 0 && p - list[i - 1] > 1 && <span className="px-1">…</span>}<button aria-current={p === page ? 'page' : undefined} onClick={() => onPage(p)} className={cx('min-w-8 rounded-lg px-2 py-1 tabular-nums transition', p === page ? 'bg-brand font-bold text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')}>{p}</button></span>)}
        <button className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:pointer-events-none disabled:opacity-40" disabled={page === pages} onClick={() => onPage(page + 1)} aria-label="Next page">›</button>
      </nav>
    </div>
  );
}

export function Field({ label, error, hint, children }) {
  return <label className="mb-3 block text-[13px] font-semibold text-slate-600">{label}{children}{hint && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}{error && <span role="alert" className="mt-1 block text-xs font-normal text-red-600">{error}</span>}</label>;
}
export const inputCls = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-normal shadow-sm transition placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15';
