import ApplicationDetail from '@/components/onboarding/ApplicationDetail';

// The same review screen the Merchant Admin uses, reached from the super-admin queue. The base
// paths travel in as props because a super admin has no /merchant-admin prefix to walk back into
// and no transactions screen to jump to.
export default function ApplicationDetailPage({ params }) {
  return (
    <ApplicationDetail
      id={params.id}
      backHref="/super-admin/applications"
      merchantHref="/super-admin/merchants"
      auditPath="/super-admin/audit-logs"
    />
  );
}
