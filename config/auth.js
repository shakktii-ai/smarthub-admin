// Maps this app to the Supabase schema. Authentication is always real Supabase Auth: there is no demo login.
export const AUTH = { profileTable: 'profiles', roleColumn: 'role', activeColumn: 'is_active' };
export const ROLES = {
  super_admin: { home: '/super-admin/dashboard', prefix: '/super-admin' },
  merchant_admin: { home: '/merchant-admin/dashboard', prefix: '/merchant-admin' },
  collection_admin: { home: '/collection-admin/dashboard', prefix: '/collection-admin' },
  upi_admin: { home: '/upi-admin/dashboard', prefix: '/upi-admin' },
};
export const ROLE_LABELS = { super_admin: 'Super Admin', merchant_admin: 'Merchant Admin', collection_admin: 'Collection Admin', upi_admin: 'UPI Admin' };
// Explicit extra dashboards a role may open WITHOUT changing its role. Empty by default (strict).
export const EXTRA_ACCESS = { super_admin: [] };
export const isSupabaseConfigured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const canAccessPath = (role, path) => [ROLES[role].prefix, ...(EXTRA_ACCESS[role] || [])].some((p) => path === p || path.startsWith(`${p}/`));
