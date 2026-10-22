import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Target of the invitation and password-recovery emails. Verifies the one-time token, creates the session,
// then sends the user to the set-password page. See README for the required email templates.
const safeNext = (n) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/auth/set-password');

export async function GET(req) {
  const url = new URL(req.url);
  const tokenHash = url.searchParams.get('token_hash'); const type = url.searchParams.get('type'); const code = url.searchParams.get('code');
  const sb = createClient(); let error = null;
  if (tokenHash && type) ({ error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type }));
  else if (code) ({ error } = await sb.auth.exchangeCodeForSession(code));
  else error = new Error('missing token');
  if (error) return NextResponse.redirect(new URL('/login?error=link', url.origin));
  return NextResponse.redirect(new URL(safeNext(url.searchParams.get('next')), url.origin));
}
