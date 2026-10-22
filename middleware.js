import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { ROLES, canAccessPath, isSupabaseConfigured } from '@/config/auth';
import { getRoleForUser } from '@/lib/auth/getRole';

// First security layer. Every API route, server action and RLS policy re-checks authorization independently.
export async function middleware(req) {
  const { pathname } = req.nextUrl;
  let res = NextResponse.next({ request: req });
  let role = null;
  if (isSupabaseConfigured()) {
    const sb = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      cookies: { getAll: () => req.cookies.getAll(), setAll: (list) => { list.forEach(({ name, value }) => req.cookies.set(name, value)); res = NextResponse.next({ request: req }); list.forEach(({ name, value, options }) => res.cookies.set(name, value, options)); } },
    });
    const { data: { user } } = await sb.auth.getUser(); // validates the JWT with Supabase (not just reads the cookie)
    if (user) role = await getRoleForUser(sb, user.id); // null when the profile is missing, inactive or has an unknown role
    var hasSession = Boolean(user);
  }
  const go = (path) => { const r = NextResponse.redirect(new URL(path, req.url)); res.cookies.getAll().forEach((c) => r.cookies.set(c)); return r; };
  if (pathname === '/login') return role ? go(ROLES[role].home) : res;
  if (!role) return go(hasSession ? '/login?error=denied' : '/login');
  if (!canAccessPath(role, pathname)) return go(ROLES[role].home);
  return res;
}
export const config = { matcher: ['/login', '/super-admin/:path*', '/merchant-admin/:path*', '/collection-admin/:path*', '/upi-admin/:path*'] };
