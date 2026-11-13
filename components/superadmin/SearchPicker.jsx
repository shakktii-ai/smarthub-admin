'use client';

import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { cx, inputCls } from '@/components/ui';

// A small "which person / which merchant do you mean?" box over a bounded
// search endpoint. It is not a select because the directory is larger than a
// page, and it keeps the picked row's label while the value sent to the server
// is the id or code the backend expects.
export default function SearchPicker({
  label,
  value,
  name,
  placeholder = 'Start typing to search…',
  onPick,
  search,
  hint,
  emptyText = 'No match.',
}) {
  const [term, setTerm] = useState('');
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const box = useRef(null);
  const request = useRef(0);
  // The parent commonly passes an inline arrow for `search`; keeping it in a
  // ref stops a new function identity from re-running the effect every render.
  const searchRef = useRef(search);
  searchRef.current = search;

  useEffect(() => {
    const onDown = (event) => {
      if (box.current && !box.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  useEffect(() => {
    if (!open || value) return undefined;
    let live = true;
    const ticket = request.current + 1;
    request.current = ticket;
    setBusy(true);
    setError('');
    const wait = term ? 250 : 0;
    const timer = setTimeout(() => {
      Promise.resolve(searchRef.current(term))
        .then((result) => {
          if (!live || request.current !== ticket) return;
          setRows(Array.isArray(result) ? result : []);
        })
        .catch((problem) => {
          if (!live) return;
          setRows([]);
          setError(problem.message || 'That list could not be loaded.');
        })
        .finally(() => {
          if (live) setBusy(false);
        });
    }, wait);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [term, open, value]);

  const clear = () => {
    onPick(null, '');
    setTerm('');
    setOpen(false);
  };

  return (
    <div ref={box} className="relative">
      {label && <span className="block text-xs font-medium text-slate-600">{label}</span>}
      <div className="relative">
        <Search
          size={15}
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-label={label || placeholder}
          className={cx(inputCls, 'pl-9', value && 'pr-14')}
          value={value ? name || `#${value}` : term}
          placeholder={value ? '' : placeholder}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            if (value) onPick(null, '');
            setTerm(event.target.value);
            setOpen(true);
          }}
        />
        {value && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-semibold text-brand hover:bg-slate-100"
          >
            Clear
          </button>
        )}
      </div>
      {hint && !value && (
        <span className="mt-1 block text-[11px] font-normal text-slate-500">{hint}</span>
      )}
      {value && (
        <span className="mt-1 block text-[11px] font-normal text-slate-500">
          Selected: {name || `#${value}`}
        </span>
      )}
      {open && !value && (
        <ul
          role="listbox"
          aria-label={label || 'Suggestions'}
          className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          {busy && <li className="px-3 py-2 text-xs text-slate-500">Searching…</li>}
          {!busy && error && (
            <li role="alert" className="px-3 py-2 text-xs text-red-600">
              {error}
            </li>
          )}
          {!busy && !error && rows.length === 0 && (
            <li className="px-3 py-2 text-xs text-slate-500">{emptyText}</li>
          )}
          {!busy &&
            !error &&
            rows.map((row) => {
              const note =
                row.meta ||
                [row.email, Array.isArray(row.roles) ? row.roles.join(', ') : row.roles]
                  .filter(Boolean)
                  .join(' · ');
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected="false"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onPick(row.id, row.name || note || String(row.id));
                      setTerm('');
                      setOpen(false);
                    }}
                  >
                    <span className="font-medium text-slate-900">
                      {row.name || String(row.id)}
                    </span>
                    {note && <span className="block text-xs text-slate-500">{note}</span>}
                  </button>
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}
