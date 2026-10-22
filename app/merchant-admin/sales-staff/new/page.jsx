import { redirect } from 'next/navigation';
import AddStaffForm from '@/components/salesstaff/AddStaffForm';
import { getCurrentProfile } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function AddSalesStaffPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'merchant_admin') redirect('/login');
  const { data } = await createAdminClient().from('territories').select('id, name, state').eq('organization_id', profile.organization_id).order('name');
  return <AddStaffForm managerName={profile.full_name || profile.email} territories={data || []} />;
}
