'use client';
import { useEffect } from 'react';
import { X, Loader2, Inbox, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

export const cx = (...a) => a.filter(Boolean).join(' ');

export function Card({ title, action, children, className = '' }) {
  return (
    <section className={cx('rounded-xl border border-slate-200 bg-white p-4 shadow-sm', className)}>
      {(title || action) && <div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-base font-semibold text-slate-900">{title}</h2>{action}</div>}
      {children}
    </section>
  );
}

const iconBg = { blue: 'bg-blue-50 text-blue-600', green: 'bg-emerald-50 text-emerald-600', amber: 'bg-orange-50 text-orange-500', purple: 'bg-violet-50 text-violet-600', red: 'bg-red-50 text-red-500' };
export function StatCard({ label, value, delta, up = true, color = 'blue', icon: Icon }) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        {Icon && <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-lg', iconBg[color])}><Icon size={20} aria-hidden /></span>}
        <div className="min-w-0">
          <p className="text-sm text-slate-600">{label}</p>
          <p className="truncate text-2xl font-bold text-slate-900">{value}</p>
          {delta && <p className={cx('mt-1 flex items-center gap-1 text-xs font-semibold', up ? 'text-emerald-600' : 'text-red-500')}>{up ? <TrendingUp size={12} aria-hidden /> : <TrendingDown size={12} aria-hidden />}{delta}<span className="font-normal text-slate-500">vs last 30 days</span></p>}
        </div>
      </div>
    </Card>
  );
}

const tones = { green: 'bg-emerald-50 text-emerald-700', red: 'bg-red-50 text-red-600', amber: 'bg-amber-50 text-amber-700', blue: 'bg-blue-50 text-blue-700', purple: 'bg-violet-50 text-violet-700', gray: 'bg-slate-100 text-slate-600' };
const map = { Success: 'green', 'Pending KYC': 'amber', Suspended: 'red', Accepted: 'green', Published: 'green', Balanced: 'green', Pending: 'amber', Due: 'amber', Paid: 'green', Overdue: 'red', Upcoming: 'blue', 'High Risk': 'red', Medium: 'amber', Low: 'green', Scheduled: 'blue', Missed: 'red', Kept: 'green', Broken: 'red', NPA: 'red', Closed: 'gray', 'Pending Documents': 'amber', Disbursed: 'green', Promised: 'blue', Escalated: 'red', Reassigned: 'gray', 'Action Needed': 'red', Monitor: 'amber', Verified: 'green', Valid: 'green', Uploaded: 'blue', Invalid: 'red', 'Re-upload': 'amber', Draft: 'gray', Completed: 'green', Active: 'green', Approved: 'green', Online: 'green', Paid: 'green', Resolved: 'green', Read: 'gray', Deployed: 'green', Failed: 'red', Rejected: 'red', Offline: 'red', Exception: 'red', Open: 'red', Unread: 'blue', Refunded: 'purple', Returned: 'purple', Pending: 'amber', 'Under Review': 'amber', 'KYC Pending': 'amber', 'In Review': 'amber', 'On Leave': 'amber', 'In Stock': 'blue', 'Document Review': 'blue', 'Bank Verification': 'blue', 'In Progress': 'blue', P1: 'red', P2: 'amber', P3: 'blue', P4: 'gray' };
export function Badge({ value }) { return <span className={cx('inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium', tones[map[value] || 'gray'])}>{value}</span>; }

export function Button({ variant = 'primary', className = '', ...p }) {
  const v = { primary: 'bg-brand text-white hover:bg-blue-700', outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50', danger: 'bg-red-600 text-white hover:bg-red-700' };
  return <button type="button" {...p} className={cx('inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition disabled:opacity-50', v[variant], className)} />;
}

export const Spinner = () => <div role="status" className="flex items-center justify-center gap-2 p-10 text-slate-500"><Loader2 className="animate-spin" size={18} aria-hidden />Loading…</div>;
export const EmptyState = ({ text = 'No records match your filters.' }) => <div className="flex flex-col items-center gap-2 p-10 text-slate-500"><Inbox size={28} aria-hidden /><p>{text}</p></div>;
export const ErrorState = ({ onRetry }) => <div role="alert" className="flex flex-col items-center gap-3 p-10 text-red-600"><AlertTriangle size={28} aria-hidden /><p>Something went wrong while loading data.</p><Button variant="outline" onClick={onRetry}>Retry</Button></div>;

function useEsc(onClose) {
  useEffect(() => { const h = (e) => e.key === 'Escape' && onClose(); document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h); }, [onClose]);
}

export function Drawer({ title, onClose, children }) {
  useEsc(onClose);
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/40" onClick={onClose}>
      <aside role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button aria-label="Close" onClick={onClose} className="rounded p-1 hover:bg-slate-100"><X size={20} /></button></div>
        {children}
      </aside>
    </div>
  );
}

export function Modal({ title, onClose, children }) {
  useEsc(onClose);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h2 className="mb-3 text-lg font-bold">{title}</h2>{children}
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
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm text-slate-600">
      <span>Showing {total === 0 ? 0 : (page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} of {total.toLocaleString('en-IN')}</span>
      <nav aria-label="Pagination" className="flex items-center gap-1">
        <button className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40" disabled={page === 1} onClick={() => onPage(page - 1)} aria-label="Previous page">‹</button>
        {list.map((p, i) => <span key={p} className="flex items-center">{i > 0 && p - list[i - 1] > 1 && <span className="px-1">…</span>}<button aria-current={p === page ? 'page' : undefined} onClick={() => onPage(p)} className={cx('min-w-8 rounded px-2 py-1', p === page ? 'bg-brand font-semibold text-white' : 'hover:bg-slate-100')}>{p}</button></span>)}
        <button className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40" disabled={page === pages} onClick={() => onPage(page + 1)} aria-label="Next page">›</button>
      </nav>
    </div>
  );
}

export function Field({ label, error, children }) {
  return <label className="mb-3 block text-sm font-medium text-slate-700">{label}{children}{error && <span role="alert" className="mt-1 block text-xs text-red-600">{error}</span>}</label>;
}
export const inputCls = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal focus:border-brand focus:outline-none';
