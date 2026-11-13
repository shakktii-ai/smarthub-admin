import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth/session';
import LoanReview from '@/components/loans/LoanReview';

export default async function LoanReviewPage({ params }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');
  return <LoanReview loanRef={params.loanRef} />;
}