// Pure JWT helpers that run in both the browser and on the server.
// These decode WITHOUT verifying the signature: they only pick a redirect target and decide
// when to refresh. Authorization itself is enforced by the backend, which re-verifies every
// Bearer token, so a forged cookie cannot reach data.

const DASHBOARD_ROLES = ["super_admin", "merchant_admin", "collection_admin", "upi_admin"];

export function decodeToken(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    // atob is global in both the Edge runtime and Node 16+; Buffer is not available in Edge.
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function isExpired(payload, skewSeconds = 30) {
  if (!payload || typeof payload.exp !== "number") return true;
  return payload.exp - skewSeconds <= Math.floor(Date.now() / 1000);
}

// The backend issues UPPER_SNAKE roles; the dashboard uses lower_snake route namespaces.
export const toDashboardRole = (role) => String(role || "").toLowerCase();

// A user may hold several backend roles. Take the highest-ranking one that owns a dashboard.
export function pickDashboardRole(roles) {
  const owned = (roles || []).map(toDashboardRole).filter((r) => DASHBOARD_ROLES.includes(r));
  return DASHBOARD_ROLES.find((r) => owned.includes(r)) || null;
}

export function sessionFromToken(token) {
  const payload = decodeToken(token);
  if (!payload || payload.typ === "refresh" || payload.typ === "mfa") return null;
  return {
    userId: payload.sub ? Number(payload.sub) : null,
    roles: payload.roles || [],
    role: pickDashboardRole(payload.roles),
    merchantCode: payload.merchant_code || null,
    expiresAt: typeof payload.exp === "number" ? payload.exp * 1000 : null,
    expired: isExpired(payload),
  };
}
