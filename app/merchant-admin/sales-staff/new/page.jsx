import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth/session';

export default async function AddSalesStaffPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'merchant_admin') redirect('/login');

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-slate-900">Add Sales Staff</h1>
      <p role="alert" className="mt-3 max-w-2xl rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        A Merchant Admin cannot add a sales user: the create-user route is restricted to
        Super Admin, so the request would be rejected. Ask a Super Admin to create the account
        with the <code className="font-semibold">SALES_MANAGER</code> role. After the account
        exists, use Territories and Staff Documents in the Sales Staff menu to manage coverage
        and review document records.
      </p>
    </div>
  );
}
