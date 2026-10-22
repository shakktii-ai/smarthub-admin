import AdminLayout from '@/components/layout/AdminLayout';
import { ROLE_LABELS } from '@/config/auth';
import { base, brand, nav, user } from '@/config/dashboards/upiAdmin';
import { getCurrentProfile } from '@/lib/auth/session';

export default async function Layout({ children }) {
  const p = await getCurrentProfile(); // trusted profile: the real name shown in the top bar
  const me = p ? { name: p.full_name || p.email, role: ROLE_LABELS[p.role] } : user;
  return <AdminLayout base={base} brand={brand} nav={nav} user={me}>{children}</AdminLayout>;
}
