'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Clock,
  Pencil,
  Play,
  Plus,
  Power,
  RotateCcw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  Pagination,
  StatCard,
  cx,
  inputCls,
} from '@/components/ui';
import { useApp } from '@/components/ui/AppContext';
import { labelize, utcDate } from '@/lib/api/labels';
import {
  RISK_SEVERITIES,
  RULE_CATEGORIES,
  alertMetaRows,
  isClosedRiskStatus,
  riskStatusLabel,
  ruleCategory,
  ruleFormFromApi,
  rulePreview,
  ruleSentence,
  windowText,
} from '@/config/approvalsRisk';
import {
  decideRiskAlert,
  evaluateRisk,
  saveRiskRule,
  searchMerchants,
  setRiskRuleActive,
} from '@/app/super-admin/risk/actions';
import { searchPeople } from '@/app/super-admin/people/actions';
import SearchPicker from '@/components/superadmin/SearchPicker';

const KEYS = [
  'view',
  'status',
  'severity',
  'type',
  'merchant',
  'merchantName',
  'q',
  'page',
];

const STATUS_TABS = [
  ['Open', 'open'],
  ['Acknowledged', 'acknowledged'],
  ['Resolved', 'resolved'],
  ['Dismissed', 'dismissed'],
  ['All', 'all'],
];

const WINDOWS = [
  [300, '5 minutes'],
  [900, '15 minutes'],
  [1800, '30 minutes'],
  [3600, '1 hour'],
  [21600, '6 hours'],
  [43200, '12 hours'],
  [86400, '24 hours'],
];

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

const stamp = (value) => {
  const date = utcDate(value);
  return date
    ? date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';
};

const countOf = (map, key) => Number(map?.[key]) || 0;

function FlowStep({ number, title, body }) {
  return (
    <div className="flex gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand">
        {number}
      </span>
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-600">{body}</p>
      </div>
    </div>
  );
}

export default function RiskCenter({ data, filters }) {
  const router = useRouter();
  const pathname = usePathname();

  const summary = data?.summary || {};
  const statusCounts = data?.statusCounts || {};
  const rules = data?.rules || [];

  const allAlerts = STATUS_TABS.slice(0, 4).reduce(
    (sum, [, key]) => sum + countOf(statusCounts, key),
    0,
  );
  const closed = countOf(statusCounts, 'resolved') + countOf(statusCounts, 'dismissed');
  const activeRules = rules.filter((rule) => rule.is_active).length;

  const push = (next) => {
    const merged = { ...filters, page: 1, ...next };
    const text = query(merged);
    router.push(text ? `${pathname}?${text}` : pathname);
  };

  const view = filters.view === 'rules' ? 'rules' : 'alerts';

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">Risk &amp; Rules</h1>
        <p className="text-sm text-slate-600">
          The rulebook says what suspicious looks like. The alert queue is what happened.
          A rule is a standing condition; when the engine matches it on a payment event it
          opens an alert with the numbers that tripped it; a person then decides what the
          alert means. Rules never move money or suspend a merchant on their own.
        </p>
      </div>

      <Card>
        <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Rule → Alert → Decision
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              This is why the screen has two tabs. <strong>Rules</strong> is the standing
              policy: the engine evaluates every active velocity, amount and device rule.
              <strong> Alerts</strong> is the work that policy produced. Resolving an alert
              records that someone investigated it; it does not reverse a payment. Dismiss
              means the match was a false positive.
            </p>
          </div>
          <div className="grid gap-3">
            <FlowStep
              number="1"
              title="A rule fires"
              body="For example: more than 50 payments by one merchant in an hour."
            />
            <FlowStep
              number="2"
              title="An alert opens"
              body="It carries the merchant, the rule, the observed numbers and a severity."
            />
            <FlowStep
              number="3"
              title="A person decides"
              body="Acknowledge it, assign it, resolve it with a note, or dismiss it as a false positive."
            />
          </div>
        </div>
      </Card>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
        <StatCard
          label="Open cases"
          value={Number(summary.total_open || 0).toLocaleString('en-IN')}
          icon={Clock}
          color="amber"
          style={{ minWidth: '18rem' }}
        />
        <StatCard
          label="Critical open"
          value={Number(summary.critical_open || 0).toLocaleString('en-IN')}
          icon={AlertTriangle}
          color="red"
          style={{ minWidth: '18rem' }}
        />
        <StatCard
          label="High open"
          value={countOf(summary.by_severity, 'high').toLocaleString('en-IN')}
          icon={AlertTriangle}
          color="amber"
          style={{ minWidth: '18rem' }}
        />
        <StatCard
          label="Closed"
          value={closed.toLocaleString('en-IN')}
          icon={Check}
          color="green"
          style={{ minWidth: '18rem' }}
        />
        <StatCard
          label="Active rules"
          value={data?.rulesError ? '—' : activeRules.toLocaleString('en-IN')}
          icon={ShieldCheck}
          color="purple"
          style={{ minWidth: '18rem' }}
        />
      </div>
      <p className="-mt-1 text-xs text-slate-500">
        “Open cases” counts open and acknowledged alerts together. Severity counts are for
        those open cases. Rules are counted across the whole rulebook.
      </p>

      <Card>
        <div
          role="tablist"
          aria-label="Risk sections"
          className="mb-3 flex flex-wrap gap-4 border-b border-slate-200"
        >
          <button
            role="tab"
            aria-selected={view === 'alerts'}
            onClick={() => push({ view: 'alerts' })}
            className={cx(
              '-mb-px border-b-2 px-1 pb-2 text-sm font-medium',
              view === 'alerts'
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-600 hover:text-slate-900',
            )}
          >
            Alerts <span className="font-normal text-slate-400">({allAlerts.toLocaleString('en-IN')})</span>
          </button>
          <button
            role="tab"
            aria-selected={view === 'rules'}
            onClick={() => push({ view: 'rules' })}
            className={cx(
              '-mb-px border-b-2 px-1 pb-2 text-sm font-medium',
              view === 'rules'
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-600 hover:text-slate-900',
            )}
          >
            Rules <span className="font-normal text-slate-400">({rules.length.toLocaleString('en-IN')})</span>
          </button>
        </div>

        {view === 'alerts' ? (
          <AlertsPanel data={data} filters={filters} push={push} />
        ) : (
          <RulesPanel data={data} />
        )}
      </Card>
    </>
  );
}

function AlertsPanel({ data, filters, push }) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.q || '');
  const [selected, setSelected] = useState(null);

  const alerts = data?.alerts || { rows: [], total: 0, page: 1, limit: 50 };
  const rows = alerts.rows || [];
  const statusCounts = data?.statusCounts || {};

  const typeOptions = useMemo(() => {
    const values = new Set();
    (data?.rules || []).forEach((rule) => values.add(rule.category));
    rows.forEach((alert) => values.add(alert.alert_type));
    if (filters.type) values.add(filters.type);
    return [...values].filter(Boolean).sort();
  }, [data?.rules, rows, filters.type]);

  const allStatuses = STATUS_TABS.slice(0, 4).reduce(
    (sum, [, key]) => sum + countOf(statusCounts, key),
    0,
  );

  const emptyText =
    filters.status === 'open'
      ? 'No open risk alerts. The engine has not matched an active rule, or the cases have already been picked up.'
      : 'No alerts match this tab and filter. Try another tab, or clear the filters.';

  return (
    <div className="space-y-3">
      <div
        role="tablist"
        aria-label="Alert status"
        className="flex flex-wrap gap-4 border-b border-slate-200"
      >
        {STATUS_TABS.map(([label, value]) => {
          const count = value === 'all' ? allStatuses : countOf(statusCounts, value);
          return (
            <button
              key={value}
              role="tab"
              aria-selected={filters.status === value}
              onClick={() => push({ status: value })}
              className={cx(
                '-mb-px border-b-2 px-1 pb-2 text-sm font-medium',
                filters.status === value
                  ? 'border-brand text-brand'
                  : 'border-transparent text-slate-600 hover:text-slate-900',
              )}
            >
              {label}{' '}
              <span className="font-normal text-slate-400">
                ({count.toLocaleString('en-IN')})
              </span>
            </button>
          );
        })}
      </div>

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
              placeholder="alert ref, title, description…"
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') push({ q: search || undefined });
              }}
            />
          </div>
          <span className="mt-1 block text-[11px] font-normal text-slate-500">
            Press Enter. Merchant names are searched with the merchant picker.
          </span>
        </label>

        <label className="block text-xs font-medium text-slate-600">
          Severity
          <select
            className={inputCls}
            value={filters.severity || ''}
            onChange={(event) =>
              push({ severity: event.target.value || undefined })
            }
          >
            <option value="">Any severity</option>
            {RISK_SEVERITIES.map((severity) => (
              <option key={severity} value={severity}>
                {labelize(severity)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs font-medium text-slate-600">
          Rule type
          <select
            className={inputCls}
            value={filters.type || ''}
            onChange={(event) => push({ type: event.target.value || undefined })}
          >
            <option value="">Any rule type</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {labelize(type)}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[11px] font-normal text-slate-500">
            Types come from the rules in this rulebook and the alerts on this page.
          </span>
        </label>

        <SearchPicker
          label="Merchant"
          value={filters.merchant}
          name={filters.merchantName}
          placeholder="Search a merchant name or code…"
          hint="Filters alerts to one merchant."
          search={(term) =>
            searchMerchants(term).then((res) => res.merchants || [])
          }
          onPick={(id, name) =>
            push({
              merchant: id || undefined,
              merchantName: id ? name : undefined,
            })
          }
        />
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => push({ q: search || undefined })}
        >
          <Search size={15} aria-hidden />
          Search
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            push({
              severity: undefined,
              type: undefined,
              merchant: undefined,
              merchantName: undefined,
              q: undefined,
            })
          }
        >
          <RotateCcw size={15} aria-hidden />
          Clear filters
        </Button>
      </div>

      {data?.error ? (
        <div className="flex flex-col items-center gap-3 p-8 text-center text-red-600">
          <AlertTriangle size={26} aria-hidden />
          <p>Could not load the risk alerts.</p>
          <p className="text-sm text-slate-600">{data.error}</p>
          <Button variant="outline" onClick={() => router.refresh()}>
            <RotateCcw size={15} aria-hidden />
            Retry
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState text={emptyText} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-2 py-2">Alert</th>
                  <th className="px-2 py-2">What happened</th>
                  <th className="px-2 py-2">Merchant</th>
                  <th className="px-2 py-2">Rule</th>
                  <th className="px-2 py-2">Severity</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Owner</th>
                  <th className="px-2 py-2" aria-label="Open" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 align-top">
                {rows.map((alert) => (
                  <tr key={alert.alert_ref} className="text-slate-800 cursor-pointer" onClick={() => setSelected(alert)}>
                    <td className="whitespace-nowrap px-2 py-2 text-xs">
                      <span className="font-mono font-semibold text-slate-900">
                        {alert.alert_ref}
                      </span>
                      <span className="block text-slate-500">
                        {stamp(alert.created_at)}
                      </span>
                    </td>
                    <td className="max-w-xs px-2 py-2">
                      <span className="font-medium">{alert.title}</span>
                      {alert.description && (
                        <span className="mt-0.5 block line-clamp-2 text-xs text-slate-500">
                          {alert.description}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-xs">
                      {alert.merchant_name || alert.merchant_code ? (
                        <>
                          <span className="font-medium">
                            {alert.merchant_name || alert.merchant_code}
                          </span>
                          {alert.merchant_code && alert.merchant_name && (
                            <span className="block font-mono text-slate-500">
                              {alert.merchant_code}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-500">Platform-wide</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-xs">
                      <span>{alert.rule_name || labelize(alert.alert_type)}</span>
                      {alert.rule_code && (
                        <span className="block font-mono text-slate-500">
                          {alert.rule_code}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <Badge value={labelize(alert.severity)} />
                    </td>
                    <td className="px-2 py-2">
                      <Badge value={labelize(alert.status)} />
                    </td>
                    <td className="px-2 py-2 text-xs">
                      {alert.assigned_to_name || (
                        <span className="text-slate-500">Unassigned</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <Button
                        variant={alert.status === 'open' ? 'primary' : 'outline'}
                        className="px-2.5 py-1 text-xs"
                        onClick={(e) => { e.stopPropagation(); setSelected(alert); }}
                      >
                        Open
                        <ArrowRight size={13} aria-hidden />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={Number(alerts.page) || 1}
            total={Number(alerts.total) || 0}
            pageSize={Number(alerts.limit) || 50}
            onPage={(page) => push({ page })}
          />
        </>
      )}

      {selected && (
        <AlertDrawer
          key={selected.alert_ref}
          alert={selected}
          onClose={() => setSelected(null)}
          onDone={() => {
            setSelected(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function AlertDrawer({ alert, onClose, onDone }) {
  const { toast } = useApp();
  const [note, setNote] = useState('');
  const [assignee, setAssignee] = useState({
    id: alert.assigned_to || null,
    name: alert.assigned_to_name || '',
  });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const closed = isClosedRiskStatus(alert.status);
  const metaRows = alertMetaRows(alert.meta);
  const noteLength = note.trim().length;

  const run = async (action) => {
    setError('');
    if ((action === 'resolve' || action === 'dismiss') && noteLength < 8) {
      setError('Write at least 8 characters saying what was checked and why the case is closed.');
      return;
    }
    if (action === 'assign' && !assignee.id) {
      setError('Pick the person this alert should belong to.');
      return;
    }
    setBusy(action);
    const res = await decideRiskAlert(
      alert.alert_ref,
      action,
      action === 'assign' ? null : note.trim(),
      action === 'assign' ? assignee.id : null,
    );
    setBusy('');
    if (res.error) {
      setError(res.error);
      return;
    }
    const messages = {
      acknowledge: 'Alert acknowledged. It stays open until resolved or dismissed.',
      assign: `Alert assigned to ${assignee.name || `#${assignee.id}`}.`,
      resolve: 'Alert resolved and the note saved.',
      dismiss: 'Alert dismissed as a false positive.',
    };
    toast(messages[action] || 'Alert updated.');
    onDone();
  };

  return (
    <Drawer title={alert.alert_ref} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge value={labelize(alert.status)} />
          <Badge value={labelize(alert.severity)} />
          <span className="text-xs text-slate-500">{stamp(alert.created_at)}</span>
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900">{alert.title}</h3>
          {alert.description && (
            <p className="mt-1 text-sm text-slate-600">{alert.description}</p>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            What a decision means
          </p>
          <p className="mt-1 text-sm text-slate-700">
            Resolving records that the alert was investigated and closes the case. It does
            not reverse the payment or change the merchant&apos;s status. Dismiss means the
            rule matched but the activity was legitimate.
          </p>
        </div>

        <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">Merchant</dt>
            <dd className="text-slate-900">
              {alert.merchant_name || alert.merchant_code || 'Platform-wide'}
            </dd>
            {alert.merchant_code && alert.merchant_name && (
              <dd className="font-mono text-xs text-slate-500">{alert.merchant_code}</dd>
            )}
          </div>
          <div>
            <dt className="text-xs text-slate-500">Rule</dt>
            <dd className="text-slate-900">
              {alert.rule_name || labelize(alert.alert_type)}
            </dd>
            {alert.rule_code && (
              <dd className="font-mono text-xs text-slate-500">{alert.rule_code}</dd>
            )}
          </div>
          <div>
            <dt className="text-xs text-slate-500">Owner</dt>
            <dd className="text-slate-900">
              {alert.assigned_to_name || 'Unassigned'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Acknowledged</dt>
            <dd className="text-slate-900">{stamp(alert.acknowledged_at)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Closed</dt>
            <dd className="text-slate-900">{stamp(alert.resolved_at)}</dd>
          </div>
        </dl>

        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Why it fired
          </p>
          {metaRows.length === 0 ? (
            <p className="text-xs text-slate-500">This alert recorded no observed values.</p>
          ) : (
            <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {metaRows.map((entry) => (
                <div
                  key={entry.key}
                  className="flex items-start justify-between gap-3 px-3 py-2 text-sm"
                >
                  <dt className="text-slate-500">{entry.label}</dt>
                  <dd className="text-right font-medium text-slate-900">{entry.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {alert.resolution_note && (
          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Resolution note
            </p>
            <p className="mt-1 text-sm text-slate-700">{alert.resolution_note}</p>
          </div>
        )}

        <div className="border-t border-slate-200 pt-4">
          <p className="mb-2 text-sm font-semibold text-slate-900">Assign this alert</p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-52 flex-1">
              <SearchPicker
                label="Owner"
                value={assignee.id}
                name={assignee.name}
                placeholder="Search a name or email…"
                search={(term) => searchPeople(term).then((res) => res.people || [])}
                onPick={(id, name) => setAssignee({ id, name })}
              />
            </div>
            <Button
              variant="outline"
              disabled={busy === 'assign' || !assignee.id}
              onClick={() => run('assign')}
            >
              {busy === 'assign' ? 'Assigning…' : 'Assign'}
            </Button>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Assigning does not change the status. It only names who owns the case next.
          </p>
        </div>

        {closed ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            This alert is {riskStatusLabel(alert.status).toLowerCase()} and cannot be
            acknowledged, resolved or dismissed again.
          </div>
        ) : (
          <div className="space-y-3 border-t border-slate-200 pt-4">
            <label className="block text-sm font-medium text-slate-700">
              Investigation note
              <textarea
                rows={3}
                className={inputCls}
                value={note}
                placeholder="What did you check? Required to resolve or dismiss."
                onChange={(event) => setNote(event.target.value)}
              />
              <span className="mt-1 block text-xs font-normal text-slate-500">
                {noteLength}/2000 characters. Resolving or dismissing needs at least 8
                characters. Acknowledging does not need a note.
              </span>
            </label>

            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={!!busy}>
                Close
              </Button>
              {alert.status === 'open' && (
                <Button
                  variant="outline"
                  onClick={() => run('acknowledge')}
                  disabled={!!busy}
                >
                  {busy === 'acknowledge' ? 'Saving…' : 'Acknowledge'}
                </Button>
              )}
              <Button
                variant="danger"
                onClick={() => run('dismiss')}
                disabled={!!busy}
              >
                {busy === 'dismiss' ? 'Saving…' : 'Dismiss as false positive'}
              </Button>
              <Button onClick={() => run('resolve')} disabled={!!busy}>
                {busy === 'resolve' ? 'Saving…' : 'Resolve case'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}

function RulesPanel({ data }) {
  const router = useRouter();
  const { toast } = useApp();
  const [formOpen, setFormOpen] = useState(false);
  const [formRule, setFormRule] = useState(null);
  const [toggling, setToggling] = useState('');

  const rules = data?.rules || [];

  const openNew = () => {
    setFormRule(null);
    setFormOpen(true);
  };

  const openEdit = (rule) => {
    setFormRule(rule);
    setFormOpen(true);
  };

  const toggle = async (rule) => {
    setToggling(rule.rule_code);
    const res = await setRiskRuleActive(rule.rule_code, !rule.is_active);
    setToggling('');
    if (res.error) {
      toast(res.error, 'error');
      return;
    }
    toast(
      rule.is_active
        ? `“${rule.name}” turned off. Existing alerts keep their rule name.`
        : `“${rule.name}” turned on. The engine will evaluate it from the next event.`,
    );
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Rules in the rulebook</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            The engine automatically evaluates active <strong>payment velocity</strong>,{' '}
            <strong>payment amount</strong> and <strong>device spread</strong> rules. A rule
            is never deleted, because old alerts quote it; turn it off instead. Editing a
            rule changes what future evaluations match, not alerts already raised.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus size={15} aria-hidden />
          New rule
        </Button>
      </div>

      <EvaluateCard />

      {data?.rulesError ? (
        <div className="flex flex-col items-center gap-3 p-8 text-center text-red-600">
          <AlertTriangle size={26} aria-hidden />
          <p>Could not load the risk rules.</p>
          <p className="text-sm text-slate-600">{data.rulesError}</p>
          <Button variant="outline" onClick={() => router.refresh()}>
            <RotateCcw size={15} aria-hidden />
            Retry
          </Button>
        </div>
      ) : rules.length === 0 ? (
        <Card>
          <EmptyState text="No rules in the rulebook yet. Create one to make the engine look for a pattern." />
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="px-2 py-2">Rule</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Severity</th>
                <th className="px-2 py-2">Fires when</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 align-top">
              {rules.map((rule) => (
                <tr key={rule.rule_code} className="text-slate-800 cursor-pointer" onClick={() => openEdit(rule)}>
                  <td className="px-2 py-2">
                    <span className="font-medium">{rule.name}</span>
                    <span className="block font-mono text-[11px] text-slate-500">
                      {rule.rule_code}
                    </span>
                    {rule.description && (
                      <span className="mt-0.5 block max-w-md text-xs text-slate-500">
                        {rule.description}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-xs">
                    {ruleCategory(rule.category)?.label || labelize(rule.category)}
                  </td>
                  <td className="px-2 py-2">
                    <Badge value={labelize(rule.severity)} />
                  </td>
                  <td className="max-w-md px-2 py-2 text-xs text-slate-600">
                    {ruleSentence(rule)}
                  </td>
                  <td className="px-2 py-2">
                    <Badge value={rule.is_active ? 'Active' : 'Inactive'} />
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="outline"
                        className="px-2 py-1 text-xs"
                        onClick={(e) => { e.stopPropagation(); openEdit(rule); }}
                      >
                        <Pencil size={13} aria-hidden />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        className="px-2 py-1 text-xs"
                        disabled={toggling === rule.rule_code}
                        onClick={(e) => { e.stopPropagation(); toggle(rule); }}
                      >
                        <Power size={13} aria-hidden />
                        {toggling === rule.rule_code
                          ? 'Saving…'
                          : rule.is_active
                            ? 'Turn off'
                            : 'Turn on'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <RuleForm
          key={formRule ? formRule.rule_code : 'new'}
          rule={formRule}
          onClose={() => setFormOpen(false)}
          onDone={() => {
            setFormOpen(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function EvaluateCard() {
  const router = useRouter();
  const { toast } = useApp();
  const [merchant, setMerchant] = useState({ id: null, name: '' });
  const [amount, setAmount] = useState('');
  const [eventType, setEventType] = useState('payment');
  const [deviceId, setDeviceId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const run = async () => {
    setError('');
    setResult(null);
    if (!merchant.id) {
      setError('Pick the merchant to evaluate.');
      return;
    }
    const rupees = Number(amount);
    if (!Number.isFinite(rupees) || rupees <= 0) {
      setError('Enter a payment amount greater than zero.');
      return;
    }
    setBusy(true);
    const res = await evaluateRisk({
      merchant: merchant.id,
      amountPaise: Math.round(rupees * 100),
      eventType,
      deviceId,
    });
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setResult(res.result);
    toast('Risk check finished.');
    router.refresh();
  };

  const fired = result?.alerts || [];

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Run a check now</h3>
          <p className="mt-1 max-w-3xl text-xs text-slate-600">
            Ask the engine to evaluate one merchant the way a live payment would. Any rule
            that fires creates a real alert in the queue above, so this is a diagnostic
            tool, not a simulation.
          </p>
        </div>
        <Button variant="outline" onClick={run} disabled={busy}>
          <Play size={15} aria-hidden />
          {busy ? 'Checking…' : 'Evaluate'}
        </Button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SearchPicker
          label="Merchant"
          value={merchant.id}
          name={merchant.name}
          placeholder="Search a merchant name or code…"
          search={(term) => searchMerchants(term).then((res) => res.merchants || [])}
          onPick={(id, name) => setMerchant({ id, name })}
        />
        <label className="block text-xs font-medium text-slate-600">
          Payment amount (₹)
          <input
            type="number"
            min="1"
            step="0.01"
            className={inputCls}
            value={amount}
            placeholder="50000"
            onChange={(event) => setAmount(event.target.value)}
          />
          <span className="mt-1 block text-[11px] font-normal text-slate-500">
            Sent to the engine in paise.
          </span>
        </label>
        <label className="block text-xs font-medium text-slate-600">
          Event type
          <select
            className={inputCls}
            value={eventType}
            onChange={(event) => setEventType(event.target.value)}
          >
            <option value="payment">Payment</option>
            <option value="refund">Refund</option>
            <option value="settlement">Settlement</option>
            <option value="login">Login</option>
          </select>
          <span className="mt-1 block text-[11px] font-normal text-slate-500">
            Stored on the alert; the engine currently counts payments.
          </span>
        </label>
        <label className="block text-xs font-medium text-slate-600">
          Device id (optional)
          <input
            type="number"
            min="1"
            step="1"
            className={inputCls}
            value={deviceId}
            placeholder="12"
            onChange={(event) => setDeviceId(event.target.value)}
          />
          <span className="mt-1 block text-[11px] font-normal text-slate-500">
            Useful when investigating a device rule.
          </span>
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-3 rounded-lg border border-slate-200 p-3 text-sm">
          <p className="font-semibold text-slate-900">
            Risk score {Number(result.risk_score) || 0} · {fired.length} alert
            {fired.length === 1 ? '' : 's'} raised
          </p>
          {fired.length === 0 ? (
            <p className="mt-1 text-slate-600">
              No active rule fired for this merchant and amount. That is the normal result
              for ordinary activity.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {fired.map((alert) => (
                <li key={alert.alert_ref} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="font-mono text-xs text-slate-600">
                    {alert.alert_ref}
                  </span>
                  <span className="font-medium text-slate-900">{alert.title}</span>
                  <Badge value={labelize(alert.severity)} />
                  <Badge value={labelize(alert.status)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

function RuleForm({ rule, onClose, onDone }) {
  const { toast } = useApp();
  const [form, setForm] = useState(() => ruleFormFromApi(rule));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const category = ruleCategory(form.category);
  const windowOptions = WINDOWS.some(([value]) => String(value) === String(form.windowSeconds))
    ? WINDOWS
    : [...WINDOWS, [Number(form.windowSeconds) || 3600, `Custom (${windowText(form.windowSeconds)})`]];

  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Give the rule a name; every alert quotes it.');
      return;
    }
    if (!rule && form.code.trim() && !/^[A-Za-z0-9][A-Za-z0-9_-]{1,39}$/.test(form.code.trim())) {
      setError(
        'A rule code can use letters, numbers, hyphens and underscores, and must be 2–40 characters.',
      );
      return;
    }
    if (category) {
      const field = category.field;
      const value = Number(form[field]);
      if (!Number.isFinite(value) || value <= 0) {
        setError(`Enter a positive ${category.thresholdLabel.toLowerCase()}.`);
        return;
      }
    }
    if (!category) {
      const raw = form.thresholdRaw.trim();
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            setError('The custom threshold must be a JSON object.');
            return;
          }
        } catch {
          setError('The custom threshold is not valid JSON.');
          return;
        }
      }
    }

    setBusy(true);
    const res = await saveRiskRule(rule?.rule_code || null, form);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    toast(rule ? 'Rule updated.' : 'Rule created and active.');
    onDone();
  };

  return (
    <Drawer
      title={rule ? `Edit ${rule.rule_code}` : 'New risk rule'}
      onClose={onClose}
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          A rule is a standing condition. Choose the type of pattern, set the limit and the
          window it is measured over, and the engine will raise an alert whenever an event
          crosses it. New rules start active; you can turn one off from the rulebook.
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Rule name
          <input
            className={inputCls}
            value={form.name}
            placeholder="Payment velocity"
            onChange={(event) => set('name', event.target.value)}
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Shown on every alert this rule raises.
          </span>
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Rule code
          {rule ? (
            <input className={inputCls} value={rule.rule_code} readOnly disabled />
          ) : (
            <input
              className={inputCls}
              value={form.code}
              placeholder="RVEL-001 (leave blank to generate)"
              onChange={(event) => set('code', event.target.value.toUpperCase())}
            />
          )}
          <span className="mt-1 block text-xs font-normal text-slate-500">
            {rule
              ? 'The code is fixed after creation so existing alerts keep pointing at this rule.'
              : 'Optional. Letters, numbers, hyphens and underscores; generated when blank.'}
          </span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Rule type
            <select
              className={inputCls}
              value={form.category}
              onChange={(event) => set('category', event.target.value)}
            >
              {RULE_CATEGORIES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              {!category && form.category && (
                <option value={form.category}>
                  Custom ({labelize(form.category)})
                </option>
              )}
            </select>
            <span className="mt-1 block text-xs font-normal text-slate-500">
              Only the three engine-backed types fire automatically.
            </span>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Severity
            <select
              className={inputCls}
              value={form.severity}
              onChange={(event) => set('severity', event.target.value)}
            >
              {RISK_SEVERITIES.map((severity) => (
                <option key={severity} value={severity}>
                  {labelize(severity)}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs font-normal text-slate-500">
              Critical and high alerts sort to the top of the queue.
            </span>
          </label>
        </div>

        {category ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              {category.thresholdLabel}
              <input
                type="number"
                min="1"
                step={category.value === 'amount' ? '0.01' : '1'}
                className={inputCls}
                value={form[category.field]}
                onChange={(event) => set(category.field, event.target.value)}
              />
              <span className="mt-1 block text-xs font-normal text-slate-500">
                {category.value === 'amount'
                  ? 'Rupees. The API stores this as paise.'
                  : category.value === 'velocity'
                    ? 'A payment count, not an amount.'
                    : 'How many devices before it looks abnormal.'}
              </span>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Measured over
              <select
                className={inputCls}
                value={form.windowSeconds}
                onChange={(event) => set('windowSeconds', event.target.value)}
              >
                {windowOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs font-normal text-slate-500">
                The engine only counts events inside this rolling window.
              </span>
            </label>
          </div>
        ) : (
          <label className="block text-sm font-medium text-slate-700">
            Custom threshold (JSON)
            <textarea
              rows={5}
              className={inputCls}
              value={form.thresholdRaw}
              onChange={(event) => set('thresholdRaw', event.target.value)}
            />
            <span className="mt-1 block text-xs font-normal text-slate-500">
              This category is not evaluated by the built-in engine. Keep the object shape
              the rule already had.
            </span>
          </label>
        )}

        <div className="rounded-lg border border-slate-200 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Preview
          </p>
          <p className="mt-1 text-sm text-slate-800">{rulePreview(form)}</p>
          {category && (
            <p className="mt-1 text-xs text-slate-500">
              Alerts are raised with severity {labelize(form.severity)} and title “{form.name || 'this rule'} triggered”.
            </p>
          )}
        </div>

        <label className="block text-sm font-medium text-slate-700">
          Description
          <textarea
            rows={3}
            className={inputCls}
            value={form.description}
            placeholder="What this rule is looking for, and what the operator should check."
            onChange={(event) => set('description', event.target.value)}
          />
          <span className="mt-1 block text-xs font-normal text-slate-500">
            Copied onto every alert. This is where the investigation context should live.
          </span>
        </label>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : rule ? 'Save rule' : 'Create rule'}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
