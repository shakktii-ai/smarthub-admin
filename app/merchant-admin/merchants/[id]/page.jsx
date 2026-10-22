import MerchantDetail from '@/components/merchants/MerchantDetail';

export default function MerchantDetailPage({ params }) {
  return <MerchantDetail id={params.id} />;
}
