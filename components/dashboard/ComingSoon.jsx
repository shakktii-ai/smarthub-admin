'use client';
import { Sparkles } from 'lucide-react';
import { Card, PageHeader, PageShell } from '@/components/ui';

export default function ComingSoon({ name }) {
  return (
    <PageShell>
      <PageHeader chip={name} chipIcon={Sparkles} title="Dashboard" subtitle="Layout, menu and routing are ready." />
      <Card className="mx-auto max-w-xl text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-[#2F6FED] to-[#28C5E8] text-white shadow-lg">
          <Sparkles size={24} aria-hidden />
        </span>
        <h2 className="mt-4 text-lg font-bold text-slate-900">{name} Dashboard</h2>
        <p className="mt-2 text-sm text-slate-600">
          This section is scaffolded and waiting for its data. Add menu items in{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">config/dashboards</code>, page configs in{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">data/pages</code>, and a{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">page.jsx</code> per route.
        </p>
      </Card>
    </PageShell>
  );
}
