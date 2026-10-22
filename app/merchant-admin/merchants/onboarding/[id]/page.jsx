import ApplicationDetail from '@/components/onboarding/ApplicationDetail';

export default function ApplicationDetailPage({ params }) {
  return <ApplicationDetail id={params.id} />;
}
