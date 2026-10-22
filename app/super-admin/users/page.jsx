import AdminUsers from '@/components/superadmin/AdminUsers';
import { listAdmins } from './actions';

export default async function UsersPage({ searchParams }) {
  const page = Math.max(1, parseInt(searchParams?.page, 10) || 1);
  const res = await listAdmins({ q: searchParams?.q || '', role: searchParams?.role || '', status: searchParams?.status || '', page });
  return <AdminUsers data={res} page={page} pageSize={10} />;
}
