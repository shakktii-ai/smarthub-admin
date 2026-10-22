import { redirect } from 'next/navigation';
import StaffTable from '@/components/salesstaff/StaffTable';
import { getCurrentProfile } from '@/lib/auth/session';
import { createAdminClient } from '@/lib/supabase/admin';

const PAGE = 10;
export default async function SalesStaffPage({ searchParams }) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'merchant_admin') redirect('/login');
  const admin = createAdminClient(); const org = profile.organization_id;
  if (!org) return <p role="alert" className="p-6 text-red-600">Your account is not linked to an organization. Contact a Super Admin.</p>;
  const page = Math.max(1, parseInt(searchParams?.page, 10) || 1);
  let q = admin.from('sales_staff')
    .select('id, employee_id, full_name, mobile, email, photo_path, status, created_at, created_by_name, territory:territories(name, state), creator:profiles!sales_staff_created_by_fkey(full_name)', { count: 'exact' })
    .eq('organization_id', org).order('created_at', { ascending: false });
  if (['pending', 'active', 'inactive', 'rejected'].includes(searchParams?.status)) q = q.eq('status', searchParams.status);
  if (/^[0-9a-f-]{36}$/i.test(searchParams?.territory || '')) q = q.eq('territory_id', searchParams.territory);
  const s = String(searchParams?.q || '').replace(/[,%()*]/g, ' ').trim().slice(0, 60);
  if (s) q = q.or(`full_name.ilike.%${s}%,mobile.ilike.%${s}%,email.ilike.%${s}%,employee_id.ilike.%${s}%`);
  const [{ data, count, error }, all, terr] = await Promise.all([q.range((page - 1) * PAGE, page * PAGE - 1), admin.from('sales_staff').select('status').eq('organization_id', org), admin.from('territories').select('id, name, state').eq('organization_id', org).order('name')]);
  const rows = data || [];
  const paths = rows.map((r) => r.photo_path).filter(Boolean);
  const signed = paths.length ? (await admin.storage.from('staff-documents').createSignedUrls(paths, 300)).data || [] : [];
  const photo = Object.fromEntries(signed.map((x) => [x.path, x.signedUrl]));
  const counts = { total: 0, active: 0, pending: 0, inactive: 0 };
  (all.data || []).forEach((r) => { counts.total += 1; if (counts[r.status] !== undefined) counts[r.status] += 1; });
  return <StaffTable error={error ? 'Could not load sales staff.' : ''} rows={rows.map((r) => ({ ...r, photoUrl: photo[r.photo_path] || null, addedBy: r.creator?.full_name || r.created_by_name }))} total={count || 0} page={page} pageSize={PAGE} counts={counts} territories={terr.data || []} />;
}
