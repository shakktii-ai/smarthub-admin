import AgentApplications from '@/components/superadmin/AgentApplications';
import { listAgentApplications } from './actions';

const STATUSES = ['submitted', 'approved', 'rejected'];
const PAGE_SIZE = 20;

export default async function AgentApplicationsPage({ searchParams }) {
  const raw = Array.isArray(searchParams) ? searchParams[0] : searchParams;
  const statusParam = String(raw?.status || '').trim().toLowerCase();
  const status = STATUSES.includes(statusParam) ? statusParam : null;
  const page = Math.max(1, Number(raw?.page) || 1);

  const res = await listAgentApplications({ status, page, pageSize: PAGE_SIZE });

  if (res.error) {
    return <p className="p-6 text-sm text-red-600">{res.error}</p>;
  }

  return (
    <div className="p-6">
      <AgentApplications
        data={res.data}
        status={status || ''}
        page={page}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
