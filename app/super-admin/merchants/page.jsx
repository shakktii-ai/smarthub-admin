import MerchantDirectory from '@/components/superadmin/MerchantDirectory';
import { listMerchants } from './actions';

export default async function MerchantsPage({ searchParams }) {
  const page = Math.max(1, parseInt(searchParams?.page, 10) || 1);
  const res = await listMerchants({
    q: searchParams?.q || '',
    status: searchParams?.status || '',
    onboarding: searchParams?.onboarding || '',
    page,
  });

  return <MerchantDirectory data={res} page={page} pageSize={10} />;
}
