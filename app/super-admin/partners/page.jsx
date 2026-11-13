import PartnerDirectory from '@/components/superadmin/PartnerDirectory';
import { listPartners } from './actions';

export default async function PartnersPage({ searchParams }) {
  const page = Math.max(1, parseInt(searchParams?.page, 10) || 1);
  const res = await listPartners({
    q: searchParams?.q || '',
    type: searchParams?.type || '',
    status: searchParams?.status || '',
    page,
  });

  return <PartnerDirectory data={res} page={page} pageSize={10} />;
}
