import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SetPasswordForm from './SetPasswordForm';

export default async function SetPasswordPage() {
  const { data: { user } } = await createClient().auth.getUser();
  if (!user) redirect('/login?error=link');
  return <SetPasswordForm />;
}
