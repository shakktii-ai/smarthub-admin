// Maps this app to the FastAPI backend. Authentication is a real backend session: there is no demo login.
import { API_BASE_URL } from './api';

export const ROLES = {
  super_admin: { home: '/super-admin/dashboard', prefix: '/super-admin' },
  merchant_admin: { home: '/merchant-admin/dashboard', prefix: '/merchant-admin' },
  collection_admin: { home: '/collection-admin/dashboard', prefix: '/collection-admin' },
  upi_admin: { home: '/upi-admin/dashboard', prefix: '/upi-admin' },
};
export const ROLE_LABELS = { super_admin: 'Super Admin', merchant_admin: 'Merchant Admin', collection_admin: 'Collection Admin', upi_admin: 'UPI Admin' };
// Explicit extra dashboards a role may open WITHOUT changing its role. Empty by default (strict).
export const EXTRA_ACCESS = { super_admin: [] };
// Every signed-in role owns its own security settings, so this is not a dashboard: it is the
// account itself. Keeping it outside the role prefixes means one screen for all four roles
// instead of four copies that drift apart.
export const SHARED_PREFIX = '/account';
export const canAccessPath = (role, path) => path === SHARED_PREFIX || path.startsWith(`${SHARED_PREFIX}/`)
  || [ROLES[role].prefix, ...(EXTRA_ACCESS[role] || [])].some((p) => path === p || path.startsWith(`${p}/`));

// Guards against a malformed base URL rather than an absent one: localhost:8000 is the default.
export const isApiConfigured = () => /^https?:\/\/[^\s]+$/i.test(API_BASE_URL);
