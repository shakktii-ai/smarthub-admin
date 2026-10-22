'use server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { ROLES, isSupabaseConfigured } from '@/config/auth';
import { getRoleForUser } from '@/lib/auth/getRole';
import { rateLimit } from '@/lib/rateLimit';
import { createClient } from '@/lib/supabase/server';

const ip = () => headers().get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

export async function signIn(prev, formData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 6) return { error: 'Enter a valid email and password.' };
  if (!isSupabaseConfigured()) return { error: 'Sign-in is not available right now. Contact your administrator.' };
  if (!rateLimit(`login:${ip()}:${email}`, 8, 5 * 60_000)) return { error: 'Too many attempts. Please wait a few minutes.' };
  const sb = createClient();
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: 'Invalid email or password.' };
  const role = await getRoleForUser(sb, data.user.id); // read from the database, never from the form
  if (!role) { await sb.auth.signOut(); return { error: 'Your account is inactive or has no assigned role. Contact a Super Admin.' }; }
  redirect(ROLES[role].home);
}

export async function signOut() {
  if (isSupabaseConfigured()) await createClient().auth.signOut();
  redirect('/login');
}

// Same response whether or not the email exists, so accounts cannot be enumerated.
export async function requestPasswordReset(email) {
  const generic = { message: 'If an account exists for this email, a reset link has been sent.' };
  const e = String(email || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(e) || !isSupabaseConfigured()) return generic;
  if (!rateLimit(`reset:${ip()}:${e}`, 3, 15 * 60_000)) return generic;
  await createClient().auth.resetPasswordForEmail(e, { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/auth/confirm?next=/auth/set-password` });
  return generic;
}
