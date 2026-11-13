import MerchantDetail from '@/components/merchants/MerchantDetail';

export default function MerchantDetailPage({ params }) {
  return (
    <MerchantDetail
      id={params.id}
      backHref="/super-admin/merchants"
      merchantHref="/super-admin/merchants"
      applicationHref="/super-admin/applications"
      auditPath="/super-admin/audit-logs"
    />
  );
}
