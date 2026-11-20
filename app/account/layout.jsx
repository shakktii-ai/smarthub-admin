import AdminLayout from '@/components/layout/AdminLayout';
import { ROLE_LABELS } from '@/config/auth';
import * as collectionAdmin from '@/config/dashboards/collectionAdmin';
import * as merchantAdmin from '@/config/dashboards/merchantAdmin';
import * as superAdmin from '@/config/dashboards/superAdmin';
import * as upiAdmin from '@/config/dashboards/upiAdmin';
import { getCurrentProfile } from '@/lib/auth/session';

// The account screens belong to the person, not to a dashboard, but they still sit inside the
// shell of whichever dashboard that person signed into - so the sidebar and top-bar search keep
// working the way they do everywhere else. The role comes from the backend profile.
const SHELLS = {
  super_admin: superAdmin,
  merchant_admin: merchantAdmin,
  collection_admin: collectionAdmin,
  upi_admin: upiAdmin,
};

export default async function AccountLayout({ children }) {
  const p = await getCurrentProfile();
  const shell = SHELLS[p?.role] || superAdmin;
  const me = p ? { name: p.full_name || p.email, role: ROLE_LABELS[p.role] } : shell.user;

  return (
    <AdminLayout base={shell.base} brand={shell.brand} nav={shell.nav} user={me} searchTarget={shell.searchTarget}>
      {children}
    </AdminLayout>
  );
}
