import { decodeToken, pickDashboardRole } from '@/lib/api/tokens';

// The backend's login response has no roles field, but the access token it returns is signed by
// the backend and carries `roles`. Decoding it is safe for choosing a landing dashboard: every
// data request re-presents the token, and the backend re-verifies signature, expiry and role.
export function getRoleFromAccessToken(accessToken) {
  const payload = decodeToken(accessToken);
  if (!payload) return null;
  return pickDashboardRole(payload.roles);
}
