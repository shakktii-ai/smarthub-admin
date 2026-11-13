import ApprovalQueue from '@/components/superadmin/ApprovalQueue';
import { loadApprovals } from './actions';

const KEYS = ['action', 'maker', 'makerName', 'q'];
const STATUSES = ['pending', 'approved', 'rejected', 'all'];

export default async function MakerCheckerPage({ searchParams }) {
  const filters = {};
  KEYS.forEach((key) => {
    const value = searchParams?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      filters[key] = String(value);
    }
  });

  // The queue opens on what needs a decision. "All" is an explicit tab, not the
  // absence of a status, so a link with no query cannot accidentally show years
  // of decided requests.
  const requested = String(searchParams?.status || '');
  filters.status = STATUSES.includes(requested) ? requested : 'pending';
  const page = Math.max(1, parseInt(searchParams?.page, 10) || 1);

  const data = await loadApprovals({ ...filters, page });

  return <ApprovalQueue data={data} filters={filters} />;
}
