'use client';
import { useEffect, useState } from 'react';
import { ImagePlus, Search } from 'lucide-react';
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Button, Card, Field, Modal, TableRow, cx, inputCls } from '@/components/ui';
import { inr, num } from '@/lib/format';
import { searchRecords, uploadMedia } from '@/services';

export function DataTable({ columns, rows, renderCell, renderActions, onRowClick, rowClassName }) {
  return (
    <div className="shp-scroll -mx-1 overflow-x-auto px-1"><table className="w-full text-sm">
      <thead><tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{columns.map((c) => <th key={c.key} className="whitespace-nowrap px-3 py-2.5">{c.label}</th>)}<th className="px-3 py-2.5 font-semibold">Actions</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={r.id} className={cx('border-t border-slate-100 transition-colors hover:bg-blue-50/50', onRowClick && 'cursor-pointer', rowClassName)} onClick={() => onRowClick?.(r)}>{columns.map((c) => <td key={c.key} className="whitespace-nowrap px-3 py-2.5">{renderCell(c, r)}</td>)}<td className="px-3 py-2.5">{renderActions(r)}</td></tr>)}</tbody>
    </table></div>
  );
}

export function FilterBar({ search, onSearch, filters = [], values, onChange, onReset }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <label className="relative min-w-52 flex-1"><span className="sr-only">Search</span><Search size={16} className="absolute left-3 top-2.5 text-slate-400" aria-hidden /><input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search in this list…" className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm transition placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15" /></label>
      {filters.map((f) => <label key={f.key} className="text-xs font-semibold text-slate-600">{f.label}<select className="mt-1 block rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-sm shadow-sm transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15" value={values[f.key] || ''} onChange={(e) => onChange({ ...values, [f.key]: e.target.value })}><option value="">All</option>{f.options.map((o, j) => <option key={`${o}-${j}`}>{o}</option>)}</select></label>)}
      <Button variant="outline" onClick={onReset}>Reset</Button>
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return <div role="tablist" className="mb-4 flex flex-wrap gap-1 rounded-xl bg-slate-900/[0.04] p-1">{tabs.map(([t, n]) => <button key={t} role="tab" aria-selected={active === t} onClick={() => onChange(t)} className={cx('rounded-lg px-3 py-1.5 text-sm font-semibold transition', active === t ? 'bg-white text-brand shadow-sm' : 'text-slate-500 hover:text-slate-900')}>{t} <span className={cx('ml-1 text-xs font-medium tabular-nums', active === t ? 'text-brand/70' : 'text-slate-400')}>({num(n)})</span></button>)}</div>;
}

export function DonutCard({ title, data, ariaLabel, money }) {
  const total = (data || []).reduce((s, c) => s + (Number(c.value) || 0), 0);
  return (
    <Card title={title}><div className="flex flex-wrap items-center gap-6">
      <div className="relative h-40 w-40 shrink-0" role="img" aria-label={ariaLabel}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" innerRadius={48} outerRadius={72} paddingAngle={2} stroke="none" cornerRadius={4}>{data.map((c) => <Cell key={c.name} fill={c.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><p className="text-xl font-extrabold tabular-nums text-slate-900">{money ? inr(total) : num(total)}</p><p className="text-[11px] text-slate-500">Total</p></div></div>
      </div>
      <ul className="min-w-0 flex-1 space-y-2 text-sm">{data.map((c) => <li key={c.name} className="flex items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} /><span className="truncate text-slate-600">{c.name}</span><b className="ml-auto pl-3 tabular-nums text-slate-800">{money ? inr(c.value) : num(c.value)}</b></li>)}</ul>
    </div></Card>
  );
}

// A form field descriptor may make its label, placeholder or hint depend on the rest of the
// values, which lets one config serve several record kinds without duplicating fields per kind.
const dynamic = (value, values) => (typeof value === 'function' ? value(values) : value);

// Only text is a real <input type>; the rest map to the native pickers so the browser validates
// the shape and gives the operator a date/time/number widget instead of a bare box.
const NATIVE_TYPES = {
  password: 'password',
  email: 'email',
  url: 'url',
  tel: 'tel',
  number: 'number',
  date: 'date',
  time: 'time',
  datetime: 'datetime-local',
};

// Banner and inbox artwork. Picking a file sends it to the backend, which stores it and hands
// back the key that is saved on the record; the preview link it also returns is signed and only
// loadable in this browser for a few minutes. An operator can still paste a third-party URL.
export function ImageField({ field, value, onValue }) {
  const [state, setState] = useState({ busy: false, preview: '', error: '' });
  const maxMb = field.maxMb || 5;
  const pick = async (file) => {
    if (!file) return;
    if (file.size > maxMb * 1024 * 1024) {
      setState({ busy: false, preview: '', error: `${file.name} is ${Math.round(file.size / 1048576)} MB - the limit is ${maxMb} MB.` });
      return;
    }
    setState({ busy: true, preview: '', error: '' });
    try {
      const stored = await uploadMedia(file, field.folder || 'banners');
      setState({ busy: false, preview: stored.url || '', error: '' });
      onValue(stored.key);
    } catch (e) {
      setState({ busy: false, preview: '', error: e.message || 'Upload failed.' });
    }
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-300 bg-slate-50">
          {state.preview ? <img src={state.preview} alt="" className="h-full w-full object-cover" /> : <ImagePlus size={18} className="text-slate-400" aria-hidden />}
        </span>
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={state.busy} className={inputCls} onChange={(e) => pick(e.target.files[0])} />
      </div>
      <input type="text" placeholder="or paste an https:// image URL" className={inputCls} value={value} onChange={(e) => onValue(e.target.value)} />
      {state.busy ? <p className="text-xs text-slate-500">Uploading…</p> : state.error ? <p role="alert" className="text-xs text-red-600">{state.error}</p> : null}
    </div>
  );
}

// A search box over a real backend list, for the fields where the operator has to name a record
// they did not just look at (which merchant gets this message). It queries the same seam endpoint
// the table uses, so it never needs the whole list, and it stores the value the backend wants
// (the merchant code) while the box shows the words the operator picked (code and name).
export function SearchField({ field, value, onValue }) {
  const s = field.search || {};
  const [text, setText] = useState('');
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [active, setActive] = useState(0);
  // The label of whatever was chosen, because a loaded page of matches will not necessarily
  // contain it again and the box would otherwise fall back to showing a bare code.
  const [chosen, setChosen] = useState(null);
  const show = open ? text : chosen?.label || value || '';
  useEffect(() => {
    if (!open) return undefined;
    let live = true;
    setBusy(true); setError('');
    const wait = text ? 250 : 0;
    const timer = setTimeout(() => {
      searchRecords(s.resource, text, s.limit || 20)
        .then((rows) => { if (live) { setRows(rows || []); setActive(0); } })
        .catch((e) => { if (live) { setRows([]); setError(e.message || 'This list could not be loaded.'); } })
        .finally(() => { if (live) setBusy(false); });
    }, wait);
    return () => { live = false; clearTimeout(timer); };
  }, [text, open, s]);
  const pick = (row) => {
    const val = s.toValue ? s.toValue(row) : row.id;
    onValue(val);
    setChosen({ value: val, label: s.toLabel ? s.toLabel(row) : String(val) });
    setText(''); setOpen(false);
  };
  const clear = () => {
    onValue('');
    setChosen(s.empty ? { value: '', label: s.empty.label } : null);
    setText(''); setOpen(false);
  };
  const keyDown = (e) => {
    const list = s.empty ? [s.empty, ...rows] : rows;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return setOpen(true);
      setActive((i) => Math.max(0, Math.min(list.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1))));
    } else if (e.key === 'Enter' && open) {
      e.preventDefault();
      const row = list[active];
      if (row) (row.id === '' || row.value === '' ? clear() : pick(row));
    } else if (e.key === 'Escape') setOpen(false);
  };
  return (
    <div className="relative">
      <div className="flex gap-2">
        <input type="text" role="combobox" aria-expanded={open} aria-label={field.label}
          placeholder={s.placeholder || 'Start typing to search…'} className={inputCls}
          value={show}
          onChange={(e) => { setText(e.target.value); setOpen(true); setChosen(null); }}
          onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={keyDown} />
        {value && <button type="button" onClick={clear} className="mt-1 shrink-0 rounded-lg border border-slate-300 px-2 text-xs">Clear</button>}
      </div>
      {open && (
        <ul role="listbox" aria-label={s.ariaLabel || 'Suggestions'} className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-300 bg-white shadow-lg">
          {s.empty && (
            <li role="option" aria-selected={active === 0}
              className={cx('px-3 py-2 text-sm', active === 0 ? 'bg-slate-100' : '')}
              onMouseEnter={() => setActive(0)} onMouseDown={(e) => e.preventDefault()} onClick={clear}>
              {s.empty.label}
              {s.empty.note && <span className="block text-xs text-slate-500">{s.empty.note}</span>}
            </li>
          )}
          {busy ? <li className="px-3 py-2 text-sm text-slate-500">Searching…</li>
            : error ? <li role="alert" className="px-3 py-2 text-sm text-red-600">{error}</li>
            : rows.length === 0 ? <li className="px-3 py-2 text-sm text-slate-500">{text ? 'No match in the merchant list.' : 'Type to search.'}</li>
            : rows.map((row, i) => (
              <li key={row.id} role="option" aria-selected={active === i + (s.empty ? 1 : 0)}
                className={cx('px-3 py-2 text-sm', active === i + (s.empty ? 1 : 0) ? 'bg-slate-100' : '')}
                onMouseEnter={() => setActive(i + (s.empty ? 1 : 0))} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(row)}>
                {s.toLabel ? s.toLabel(row) : row.id}
                {s.toNote && <span className="block text-xs text-slate-500">{s.toNote(row)}</span>}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

export function FormModal({ title, fields, tabs, onSubmit, onClose, initial = {} }) {
  const [v, setV] = useState(initial); const [errs, setErrs] = useState({}); const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  // Hidden fields are neither validated nor submitted, so switching a record kind cannot send
  // values that belong to another kind.
  const allFields = tabs ? tabs.flatMap(t => t.form) : fields;
  const shown = allFields.filter((f) => !f.showIf || f.showIf(v));
  const blank = (f) => (f.type === 'checkbox' ? !v[f.name] : !String(v[f.name] ?? '').trim());
  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    shown.forEach((f) => {
      const required = dynamic(f.required, v);
      if (required && blank(f)) er[f.name] = f.type === 'checkbox' ? 'This confirmation is required' : `${dynamic(f.label, v)} is required`;
      else if (f.pattern && !blank(f) && !f.pattern.test(String(v[f.name]).trim())) er[f.name] = f.message || 'Invalid value';
      else if (f.validate) { const m = f.validate(v); if (m) er[f.name] = m; }
    });
    setErrs(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      await onSubmit(Object.fromEntries(shown.map((f) => [f.name, v[f.name]])));
    } finally {
      setBusy(false);
    }
  };
  const set = (f, val) => setV({ ...v, [f.name]: f.upper && typeof val === 'string' ? val.toUpperCase() : val });
  const renderFields = (fieldList) => fieldList.map((f) => {
    const label = dynamic(f.label, v); const placeholder = dynamic(f.placeholder, v); const hint = dynamic(f.hint, v); const required = dynamic(f.required, v);
    return (
    <Field key={f.name} label={f.type === 'checkbox' ? '' : `${label}${required ? ' *' : ''}`} error={errs[f.name]} hint={hint}>
      {f.type === 'select' ? <select className={inputCls} value={v[f.name] || ''} onChange={(e) => set(f, e.target.value)}><option value="">Select…</option>{f.options.map((o) => <option key={Array.isArray(o) ? o[1] : o} value={Array.isArray(o) ? o[1] : o}>{Array.isArray(o) ? o[0] : o}</option>)}</select>
        : f.type === 'checkbox' ? <span className="flex items-center gap-2 font-normal"><input type="checkbox" checked={!!v[f.name]} onChange={(e) => set(f, e.target.checked)} />{label}{required ? ' *' : ''}</span>
        : f.type === 'textarea' ? <textarea rows={f.rows || 6} className={inputCls} placeholder={placeholder} value={v[f.name] || ''} onChange={(e) => set(f, e.target.value)} />
        : f.type === 'image' ? <ImageField field={f} value={v[f.name] || ''} onValue={(val) => set(f, val)} />
        : f.type === 'search' ? <SearchField field={f} value={v[f.name] || ''} onValue={(val) => set(f, val)} />
        : <input type={NATIVE_TYPES[f.type] || 'text'} min={f.min} max={f.max} step={f.step ?? (f.type === 'number' ? 'any' : undefined)} placeholder={placeholder} minLength={f.minLength} autoComplete={f.autoComplete} className={inputCls} value={v[f.name] ?? ''} onChange={(e) => set(f, e.target.value)} />}
    </Field>);
  });

  return (
    <Modal title={title} onClose={onClose}><form onSubmit={submit} noValidate className="max-h-[70vh] overflow-y-auto pr-1">
      {tabs ? (
        <>
          <div className="mb-4 flex gap-2 border-b border-slate-100">
            {tabs.map((t, i) => (
              <button key={t.label} type="button" className={cx('pb-2 text-sm font-semibold border-b-2 -mb-px', activeTab === i ? 'border-brand text-brand' : 'border-transparent text-slate-500')} onClick={() => setActiveTab(i)}>{t.label}</button>
            ))}
          </div>
          {renderFields(tabs[activeTab].form)}
        </>
      ) : renderFields(shown)}
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></div>
    </form></Modal>
  );
}
