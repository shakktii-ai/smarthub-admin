import { NextResponse } from 'next/server';

// Target of the password-recovery email. The backend's reset flow is token-based (POST
// /password/forgot returns a token, POST /password/reset consumes it) and does not create a
// session, so this only forwards the token to the set-password page. Validation happens when the
// token is actually consumed.
const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/auth/set-password');

export async function GET(req) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') || url.searchParams.get('token_hash');
  if (!token) return NextResponse.redirect(new URL('/login?error=link', url.origin));
  const target = safeNext(url.searchParams.get('next'));
  const sep = target.includes('?') ? '&' : '?';
  return NextResponse.redirect(new URL(`${target}${sep}token=${encodeURIComponent(token)}`, url.origin));
}
