'use server';
import { redirect } from 'next/navigation';
import { ROLES } from '@/config/auth';
import { getRoleForUser } from '@/lib/auth/getRole';
import { createClient } from '@/lib/supabase/server';

export async function setPassword(prev, formData) {
  const password = String(formData.get('password') || ''); const confirm = String(formData.get('confirm') || '');
  if (password.length < 10 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) return { error: 'Use at least 10 characters with upper case, lower case and a number.' };
  if (password !== confirm) return { error: 'Passwords do not match.' };
  const sb = createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'This link has expired. Request a new one.' };
  const { error } = await sb.auth.updateUser({ password });
  if (error) return { error: 'Could not set the password. Try again.' };
  const role = await getRoleForUser(sb, user.id);
  if (!role) { await sb.auth.signOut(); redirect('/login?error=denied'); }
  redirect(ROLES[role].home);
}
