import MerchantGroups from '@/components/merchants/MerchantGroups';
import { loadGroups } from './actions';

export default async function MerchantsGroupsPage({ searchParams }) {
  const page = Math.max(1, parseInt(searchParams?.page, 10) || 1);
  const res = await loadGroups({
    q: searchParams?.q || '',
    status: searchParams?.status || '',
    page,
  });

  return <MerchantGroups data={res} page={page} pageSize={10} />;
}
