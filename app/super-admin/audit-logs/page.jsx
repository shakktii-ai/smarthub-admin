import AuditTrail from '@/components/superadmin/AuditTrail';
import { listAuditEvents, listAuditFacets } from './actions';

const KEYS = ['from', 'to', 'actor', 'actorName', 'action', 'resource', 'resourceId', 'q'];

export default async function AuditLogsPage({ searchParams }) {
  const filters = {};
  KEYS.forEach((key) => {
    const value = searchParams?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      filters[key] = String(value);
    }
  });
  const page = Math.max(1, parseInt(searchParams?.page, 10) || 1);

  const [data, facets] = await Promise.all([
    listAuditEvents({ ...filters, page }),
    listAuditFacets(filters.from),
  ]);

  return <AuditTrail data={data} facets={facets} filters={filters} />;
}
