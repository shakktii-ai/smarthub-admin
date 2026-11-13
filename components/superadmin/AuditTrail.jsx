'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AlertTriangle, ChevronDown, RotateCcw, Search } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Pagination, cx, inputCls } from '@/components/ui';
import { utcDate } from '@/lib/api/labels';
import { searchAuditActors } from '@/app/super-admin/audit-logs/actions';

const LIMIT = 100;

// Filters live in the URL so a saved search or a link in a chat opens the same
// slice of the trail; the page fetches server-side on every navigation.
const KEYS = ['from', 'to', 'actor', 'actorName', 'action', 'resource', 'resourceId', 'q', 'page'];

const query = (params) => {
  const text = new URLSearchParams();
  KEYS.forEach((key) => {
    const value = params[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      text.set(key, String(value).trim());
    }
  });
  return text.toString();
};

const formatStamp = (value) => {
  const d = utcDate(value);
  return d ? d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' }) : '—';
};

const dayString = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const ago = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return dayString(d);
};

const valueText = (v) => {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

// Trail payloads are flat dicts written by the routes: `changed` names the
// fields touched, `previous` and `from`/`to` carry what was there before.
function Payload({ payload }) {
  if (!payload || typeof payload !== 'object') {
    return <p className="text-xs text-slate-500">No values recorded on this event.</p>;
  }

  const changed = Array.isArray(payload.changed) ? payload.changed : null;
  const special = new Set(['changed', 'previous', 'from', 'to']);
  const entries = Object.entries(payload).filter(
    ([key, value]) => !special.has(key) && value !== undefined,
  );
  const hasPrevious = Object.prototype.hasOwnProperty.call(payload, 'previous');
  const hasWindow = payload.from !== undefined && payload.to !== undefined;

  if (!changed && !hasPrevious && !hasWindow && entries.length === 0) {
    return <p className="text-xs text-slate-500">No values recorded on this event.</p>;
  }

  return (
    <div className="space-y-2">
      {changed && (
        <div className="flex flex-wrap items-center gap-1 text-xs">
          <span className="text-slate-500">Fields written:</span>
          {changed.map((field) => (
            <span
              key={field}
              className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700"
            >
              {field}
            </span>
          ))}
        </div>
      )}
      {hasPrevious && (
        <p className="text-xs">
          <span className="text-slate-500">Was: </span>
          <span className="font-mono text-slate-800">{valueText(payload.previous)}</span>
        </p>
      )}
      {hasWindow && (
        <p className="text-xs">
          <span className="text-slate-500">Moved: </span>
          <span className="font-mono text-slate-800">
            {valueText(payload.from)} → {valueText(payload.to)}
          </span>
        </p>
      )}
      {entries.length > 0 && (
        <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
          {entries.map(([key, value]) => (
            <div key={key} className="flex min-w-0 gap-2 text-xs">
              <dt className="shrink-0 font-mono text-slate-500">{key}</dt>
              <dd className="min-w-0 break-words text-slate-800">{valueText(value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function ActorPicker({ value, name, onPick }) {
  const [term, setTerm] = useState('');
  const [actors, setActors] = useState([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setBusy(true);
    const timer = setTimeout(async () => {
      const res = await searchAuditActors(term);
      if (!cancelled) {
        setActors(res.actors || []);
        setBusy(false);
      }
    }, term ? 250 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term, open]);

  useEffect(() => {
    const onClick = (event) => {
      if (box.current && !box.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={box} className="relative">
      <label className="block text-xs font-medium text-slate-600">
        Performed by
        <input
          className={inputCls}
          value={value ? name || `User #${value}` : ''}
          placeholder={value ? '' : 'Search a name or email…'}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            if (value) onPick(null, '');
            setTerm(event.target.value);
            setOpen(true);
          }}
        />
      </label>
      {open && !value && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {busy && <li className="px-3 py-2 text-xs text-slate-500">Searching…</li>}
          {!busy && actors.length === 0 && (
            <li className="px-3 py-2 text-xs text-slate-500">
              Nobody in the user directory matches.
            </li>
          )}
          {!busy &&
            actors.map((actor) => (
              <li key={actor.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => {
                    onPick(actor.id, actor.name);
                    setOpen(false);
                  }}
                >
                  <span className="font-medium text-slate-900">{actor.name}</span>
                  <span className="block text-xs text-slate-500">
                    {actor.email} · {actor.roles.join(', ') || 'no roles'}
                  </span>
                </button>
              </li>
            ))}
        </ul>
      )}
      {value && (
        <button
          type="button"
          className="mt-1 text-xs font-semibold text-brand hover:underline"
          onClick={() => onPick(null, '')}
        >
          Clear actor filter
        </button>
      )}
    </div>
  );
}

export default function AuditTrail({ data, facets, filters }) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(filters.q || '');
  const [expanded, setExpanded] = useState(null);

  const push = (next) => {
    const merged = { ...filters, page: 1, ...next };
    const text = query(merged);
    router.push(text ? `${pathname}?${text}` : pathname);
  };

  const pages = useMemo(() => {
    const total = Number(data?.total) || 0;
    return { total, page: Number(data?.page) || 1 };
  }, [data]);

  const rows = data?.rows || [];

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">Audit Trail</h1>
        <p className="text-sm text-slate-600">
          Every sensitive change on the platform, read straight from the append-only table:
          who did it, from which address, to which record, and what the value was before.
          The window, the search and the paging all run on the server, so a query over six
          months costs the same as one over six minutes. Rows written before the trail began
          recording an actor stay in the list and say so.
        </p>
      </div>

      <Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-xs font-medium text-slate-600">
            Search
            <div className="relative">
              <Search
                size={15}
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                className={cx(inputCls, 'pl-9')}
                value={search}
                placeholder="order id, IP, setting key…"
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') push({ q: search });
                }}
              />
            </div>
            <span className="mt-1 block text-[11px] font-normal text-slate-500">
              Matches the action, the entity, its id, the address and the stored values.
              Press Enter.
            </span>
          </label>

          <label className="block text-xs font-medium text-slate-600">
            From (IST day)
            <input
              type="date"
              className={inputCls}
              value={filters.from || ''}
              onChange={(event) => push({ from: event.target.value || undefined })}
            />
          </label>

          <label className="block text-xs font-medium text-slate-600">
            To (IST day)
            <input
              type="date"
              className={inputCls}
              value={filters.to || ''}
              onChange={(event) => push({ to: event.target.value || undefined })}
            />
          </label>

          <ActorPicker
            value={filters.actor}
            name={filters.actorName}
            onPick={(id, name) =>
              push({
                actor: id || undefined,
                actorName: id ? name : undefined,
              })
            }
          />

          <label className="block text-xs font-medium text-slate-600">
            Action
            <select
              className={inputCls}
              value={filters.action || ''}
              onChange={(event) => push({ action: event.target.value || undefined })}
            >
              <option value="">Any action</option>
              {(facets?.actions || []).map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-medium text-slate-600">
            Entity type
            <select
              className={inputCls}
              value={filters.resource || ''}
              onChange={(event) => push({ resource: event.target.value || undefined })}
            >
              <option value="">Any entity</option>
              {(facets?.resources || []).map((resource) => (
                <option key={resource} value={resource}>
                  {resource}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-medium text-slate-600">
            Entity id
            <input
              className={inputCls}
              defaultValue={filters.resourceId || ''}
              placeholder="SHP-1234, 41…"
              onKeyDown={(event) => {
                if (event.key === 'Enter')
                  push({ resourceId: event.currentTarget.value || undefined });
              }}
            />
          </label>

          <div className="flex flex-wrap items-end gap-2">
            <Button variant="outline" onClick={() => push({ from: ago(1), to: dayString(new Date()) })}>
              Today
            </Button>
            <Button variant="outline" onClick={() => push({ from: ago(7), to: dayString(new Date()) })}>
              7 days
            </Button>
            <Button variant="outline" onClick={() => push({ from: ago(30), to: dayString(new Date()) })}>
              30 days
            </Button>
            <Button variant="outline" onClick={() => router.replace(pathname)}>
              <RotateCcw size={15} aria-hidden />
              Clear
            </Button>
          </div>
        </div>
      </Card>

      {data?.error ? (
        <Card>
          <div className="flex flex-col items-center gap-3 p-8 text-center text-red-600">
            <AlertTriangle size={26} aria-hidden />
            <p>Could not load the audit trail.</p>
            <p className="text-sm text-slate-600">{data.error}</p>
            <Button variant="outline" onClick={() => router.refresh()}>
              Retry
            </Button>
          </div>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState text="No events match this window. Widen the dates, or clear a filter." />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-2 py-2">When (IST)</th>
                  <th className="px-2 py-2">Who</th>
                  <th className="px-2 py-2">Action</th>
                  <th className="px-2 py-2">Entity</th>
                  <th className="px-2 py-2">IP</th>
                  <th className="px-2 py-2" aria-label="Details" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 align-top">
                {rows.map((row) => (
                  <tr key={row.id} className="text-slate-800 cursor-pointer" onClick={() => setExpanded(expanded === row.id ? null : row.id)}>
                    <td className="whitespace-nowrap px-2 py-2 text-xs">
                      {formatStamp(row.created_at)}
                    </td>
                    <td className="px-2 py-2">
                      {row.actor_name || row.actor_email ? (
                        <>
                          <span className="font-medium">{row.actor_name || row.actor_email}</span>
                          {row.actor_roles?.length > 0 && (
                            <span className="mt-1 flex flex-wrap gap-1">
                              {row.actor_roles.map((role) => (
                                <Badge key={role} value={role} />
                              ))}
                            </span>
                          )}
                        </>
                      ) : row.actor_id ? (
                        <span className="text-xs">User #{row.actor_id}</span>
                      ) : (
                        <span className="text-xs text-slate-500">
                          Unattributed — written before the trail recorded actors
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 font-mono text-xs">{row.action}</td>
                    <td className="px-2 py-2 text-xs">
                      {row.resource_type ? (
                        <>
                          <span className="font-medium">{row.resource_type}</span>
                          {row.resource_id && (
                            <span className="block font-mono text-slate-600">{row.resource_id}</span>
                          )}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-2 py-2 font-mono text-xs">{row.ip_address || '—'}</td>
                    <td className="px-2 py-2 text-right">
                      <span
                        aria-expanded={expanded === row.id}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-brand hover:bg-slate-50"
                      >
                        <ChevronDown
                          size={14}
                          aria-hidden
                          className={cx('transition', expanded === row.id && 'rotate-180')}
                        />
                        Values
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-3">
            <Pagination
              page={pages.page}
              total={pages.total}
              pageSize={LIMIT}
              onPage={(page) => push({ page })}
            />
          </div>
        </Card>
      )}
    </>
  );
}
