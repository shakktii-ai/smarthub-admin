'use client';

import { useMemo, useState } from 'react';
import { BarChart3, Search } from 'lucide-react';
import { Card, EmptyState } from '@/components/ui';

const fmt = (n) => (Number(n) || 0).toLocaleString('en-IN');
const inr = (paise) =>
  '₹' +
  ((Number(paise) || 0) / 100).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  });

export default function MandateAgents({ data }) {
  const [q, setQ] = useState('');
  const items = data?.items || [];
  const totals = data
    ? {
        totalAgents: data.totalAgents,
        mandatesTotal: data.mandatesTotal,
        mandatesThisMonth: data.mandatesThisMonth,
        mandatesActive: data.mandatesActive,
        amountPaiseTotal: data.amountPaiseTotal,
      }
    : null;

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((r) =>
      [r.fullName, r.phone, r.agentCode, r.team, r.region, r.role]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(needle)),
    );
  }, [q, items]);

  if (!data) {
    return <EmptyState text="Mandate statistics could not be loaded." />;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          ['Agents', fmt(totals.totalAgents)],
          ['Mandates (total)', fmt(totals.mandatesTotal)],
          ['This month', fmt(totals.mandatesThisMonth)],
          ['Active mandates', fmt(totals.mandatesActive)],
          ['Amount (₹)', inr(totals.amountPaiseTotal)],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p className="mt-1 text-xl font-extrabold text-slate-900">{value}</p>
          </Card>
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search agent, code, phone, team or region…"
          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-500"
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState text="No mandate statistics yet. Mandates created in the collect app will appear here, one row per agent." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs text-slate-600">
                {[
                  'Agent',
                  'Code',
                  'Team / Region',
                  'EMI',
                  'Education',
                  'Total',
                  'This month',
                  'Active',
                  'Amount',
                ].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap px-3 py-2 font-semibold"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.userId} className="border-t border-slate-100">
                  <td className="whitespace-nowrap px-3 py-2">
                    <p className="font-semibold text-slate-900">
                      {row.fullName || '-'}
                    </p>
                    <p className="text-xs text-slate-500">{row.phone || ''}</p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                    {row.agentCode || 'Not assigned'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                    {[row.team, row.region].filter(Boolean).join(' · ') || '-'}
                  </td>
                  <td className="px-3 py-2 text-slate-900">{fmt(row.emiMandates)}</td>
                  <td className="px-3 py-2 text-slate-900">{fmt(row.educationMandates)}</td>
                  <td className="px-3 py-2 font-bold text-slate-900">
                    {fmt(row.mandatesTotal)}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {fmt(row.mandatesThisMonth)}
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {fmt(row.mandatesActive)}
                  </td>
                  <td className="px-3 py-2 text-slate-900">
                    {inr(row.amountPaiseTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
