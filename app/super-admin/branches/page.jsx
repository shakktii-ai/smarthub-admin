
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

const list = await auth.api
  .get('/api/branches/v1', { limit: 200 })
  .catch((loadError) => {
    console.error('Load branches failed:', loadError.message);
    return null;
  });

  if (!list) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Unable to load branches. Please check the API configuration.
      </p>
    );
  }

  // The backend has no territory model, so `territories` is always empty here.
  return (
    <BranchesClient
      branches={(list.items || [])
        .map((b) => ({
          id: b.branch_code,
          name: b.name,
          code: b.branch_code,
          city: b.city,
          address: b.address,
          is_active: b.status === 'active',
          created_at: b.created_at,
          territories: [],
        }))
        .sort((x, y) => (x.created_at < y.created_at ? 1 : -1))}
    />
  );
}
