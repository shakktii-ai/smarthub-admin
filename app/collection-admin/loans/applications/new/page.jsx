import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth/session';
import NewLoanApplication from '@/components/loans/NewLoanApplication';

export default async function NewLoanApplicationPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');
  return <NewLoanApplication />;
}