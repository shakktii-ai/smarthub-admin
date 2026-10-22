
import { authorize } from '@/lib/auth/session';
import BranchesClient from './BranchesClient';

export const dynamic = 'force-dynamic';

export default async function BranchesPage() {
  const auth = await authorize(['super_admin']);

  if (auth.error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-5">
        <h1 className="font-semibold text-red-800">
          Access Denied
        </h1>
        <p className="mt-1 text-sm text-red-700">
          {auth.message || auth.error}
        </p>
      </div>
    );
  }

const { data, error } = await auth.admin
  .from('branches')
  .select(`
    id,
    name,
    code,
    city,
    address,
    is_active,
    created_at,
    territories (
      id,
      name,
      state
    )
  `)
  .order('created_at', { ascending: false });


  if (error) {
    console.error('Load branches failed:', error.message);

    return (
      <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Unable to load branches. Please check your database configuration.
      </p>
    );
  }

  return <BranchesClient branches={data || []} />;
}
