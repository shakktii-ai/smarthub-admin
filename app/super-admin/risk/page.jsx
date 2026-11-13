import RiskCenter from '@/components/superadmin/RiskCenter';
import { loadRisk } from './actions';

const KEYS = ['severity', 'type', 'merchant', 'merchantName', 'q'];
const STATUSES = ['open', 'acknowledged', 'resolved', 'dismissed', 'all'];

export default async function RiskPage({ searchParams }) {
  const filters = {};
  KEYS.forEach((key) => {
    const value = searchParams?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      filters[key] = String(value);
    }
  });

  filters.view = searchParams?.view === 'rules' ? 'rules' : 'alerts';

  // Open alerts are the work queue; resolved and dismissed are history. As with
  // approvals, "All" is an explicit choice so the default stays actionable.
  const requested = String(searchParams?.status || '');
  filters.status = STATUSES.includes(requested) ? requested : 'open';
  const page = Math.max(1, parseInt(searchParams?.page, 10) || 1);

  const data = await loadRisk({ ...filters, page });

  return <RiskCenter data={data} filters={filters} />;
}
