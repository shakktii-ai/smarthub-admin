import { NextResponse } from 'next/server';
import { ROLES, canAccessPath } from '@/config/auth';
import { COOKIES } from '@/config/api';
import { sessionFromToken } from '@/lib/api/tokens';

// First security layer, and only a routing hint: this decodes the backend JWT without verifying
// the signature. Every API call re-presents that token and the backend verifies signature, expiry,
// session revocation and role independently, so nothing here is trusted as an authorisation decision.
export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const res = NextResponse.next({ request: req });

  const access = req.cookies.get(COOKIES.access)?.value || '';
  const session = sessionFromToken(access);
  // A slightly expired access token still tells us who this is; data calls rotate it via /api/session/refresh.
  const role = session?.role || null;
  const hasSession = Boolean(session) || Boolean(req.cookies.get(COOKIES.present)?.value);

  const go = (path) => {
    const r = NextResponse.redirect(new URL(path, req.url));
    res.cookies.getAll().forEach((c) => r.cookies.set(c.name, c.value));
    return r;
  };

  if (pathname === '/login') return role ? go(ROLES[role].home) : res;
  if (!role) return go(hasSession ? '/login?error=denied' : '/login');
  if (!canAccessPath(role, pathname)) return go(ROLES[role].home);
  return res;
}

export const config = { matcher: ['/login', '/account/:path*', '/super-admin/:path*', '/merchant-admin/:path*', '/collection-admin/:path*', '/upi-admin/:path*'] };
