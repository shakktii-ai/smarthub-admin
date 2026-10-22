'use client';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Button, Card, Field, Modal, cx, inputCls } from '@/components/ui';
import { num } from '@/lib/format';

export function DataTable({ columns, rows, renderCell, renderActions }) {
  return (
    <div className="overflow-x-auto"><table className="w-full text-sm">
      <thead><tr className="bg-slate-50 text-left text-xs text-slate-600">{columns.map((c) => <th key={c.key} className="whitespace-nowrap px-3 py-2 font-semibold">{c.label}</th>)}<th className="px-3 py-2 font-semibold">Actions</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">{columns.map((c) => <td key={c.key} className="whitespace-nowrap px-3 py-2.5">{renderCell(c, r)}</td>)}<td className="px-3 py-2.5">{renderActions(r)}</td></tr>)}</tbody>
    </table></div>
  );
}

export function FilterBar({ search, onSearch, filters = [], values, onChange, onReset }) {
  return (
    <div className="mb-3 flex flex-wrap items-end gap-3">
      <label className="relative min-w-52 flex-1"><span className="sr-only">Search</span><Search size={16} className="absolute left-3 top-2.5 text-slate-400" aria-hidden /><input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search in this list…" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-brand focus:outline-none" /></label>
      {filters.map((f) => <label key={f.key} className="text-xs font-medium text-slate-600">{f.label}<select className="mt-1 block rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" value={values[f.key] || ''} onChange={(e) => onChange({ ...values, [f.key]: e.target.value })}><option value="">All</option>{f.options.map((o) => <option key={o}>{o}</option>)}</select></label>)}
      <Button variant="outline" onClick={onReset}>Reset</Button>
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return <div role="tablist" className="mb-3 flex flex-wrap gap-4 border-b border-slate-200">{tabs.map(([t, n]) => <button key={t} role="tab" aria-selected={active === t} onClick={() => onChange(t)} className={cx('-mb-px border-b-2 px-1 pb-2 text-sm font-medium', active === t ? 'border-brand text-brand' : 'border-transparent text-slate-600 hover:text-slate-900')}>{t} <span className="font-normal text-slate-400">({num(n)})</span></button>)}</div>;
}

export function DonutCard({ title, data, ariaLabel }) {
  return (
    <Card title={title}><div className="flex flex-wrap items-center gap-6">
      <div className="h-36 w-36" role="img" aria-label={ariaLabel}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" innerRadius={38} outerRadius={64} stroke="none">{data.map((c) => <Cell key={c.name} fill={c.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
      <ul className="space-y-1 text-sm">{data.map((c) => <li key={c.name} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />{c.name}<b className="ml-auto pl-4">{num(c.value)}</b></li>)}</ul>
    </div></Card>
  );
}

export function FormModal({ title, fields, onSubmit, onClose, initial = {} }) {
  const [v, setV] = useState(initial); const [errs, setErrs] = useState({}); const [busy, setBusy] = useState(false);
  const blank = (f) => (f.type === 'checkbox' ? !v[f.name] : !String(v[f.name] || '').trim());
  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    fields.forEach((f) => {
      if (f.required && blank(f)) er[f.name] = f.type === 'checkbox' ? 'This confirmation is required' : `${f.label} is required`;
      else if (f.pattern && !blank(f) && !f.pattern.test(String(v[f.name]).trim())) er[f.name] = f.message || 'Invalid value';
    });
    setErrs(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      await onSubmit(v);
    } finally {
      setBusy(false);
    }
  };
  const set = (f, val) => setV({ ...v, [f.name]: f.upper && typeof val === 'string' ? val.toUpperCase() : val });
  return (
    <Modal title={title} onClose={onClose}><form onSubmit={submit} noValidate className="max-h-[70vh] overflow-y-auto pr-1">
      {fields.map((f) => (
        <Field key={f.name} label={f.type === 'checkbox' ? '' : `${f.label}${f.required ? ' *' : ''}`} error={errs[f.name]}>
          {f.type === 'select' ? <select className={inputCls} value={v[f.name] || ''} onChange={(e) => set(f, e.target.value)}><option value="">Select…</option>{f.options.map((o) => <option key={o}>{o}</option>)}</select>
            : f.type === 'checkbox' ? <span className="flex items-center gap-2 font-normal"><input type="checkbox" checked={!!v[f.name]} onChange={(e) => set(f, e.target.checked)} />{f.label}{f.required ? ' *' : ''}</span>
            : f.type === 'file' ? <input type="file" accept=".pdf,.jpg,.jpeg,.png" className={inputCls} onChange={(e) => set(f, e.target.files[0]?.name || '')} />
            : <input type={f.type === 'password' ? 'password' : 'text'} minLength={f.minLength} autoComplete={f.autoComplete} className={inputCls} value={v[f.name] || ''} onChange={(e) => set(f, e.target.value)} />}
        </Field>))}
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></div>
    </form></Modal>
  );
}
