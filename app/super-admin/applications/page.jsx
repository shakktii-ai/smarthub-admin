import ApplicationQueue from '@/components/superadmin/ApplicationQueue';
import { listApplications } from './actions';

export default async function ApplicationsPage({ searchParams }) {
  const page = Math.max(1, parseInt(searchParams?.page, 10) || 1);
  const res = await listApplications({
    q: searchParams?.q || '',
    status: searchParams?.status || '',
    page,
  });

  return <ApplicationQueue data={res} page={page} pageSize={10} />;
}
