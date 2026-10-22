import { Card } from '@/components/ui';

export default function ComingSoon({ name }) {
  return (
    <Card className="mx-auto mt-10 max-w-xl text-center">
      <h1 className="text-2xl font-bold">{name} Dashboard</h1>
      <p className="mt-2 text-sm text-slate-600">Layout, menu and routing are ready. Add menu items in <code>config/dashboards</code>, page configs in <code>data/pages</code>, and a <code>page.jsx</code> per route.</p>
    </Card>
  );
}
