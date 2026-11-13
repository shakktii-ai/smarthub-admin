import ResourcePage from '@/components/ResourcePage';

// The list reads /api/identity/v1/users?role=SALES_MANAGER, which a Merchant Admin token is
// allowed to call. Add/edit live behind a Super Admin gate, so they are not offered here.
export default function SalesStaffPage() {
  return <ResourcePage dashboard="merchantAdmin" pageKey="sales-staff" />;
}
