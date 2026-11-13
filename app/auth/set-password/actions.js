'use server';
import { redirect } from 'next/navigation';
import { resetPassword } from '@/lib/auth/backend';

// Consumes the emailed token. The backend does not create a session here, so the user signs in
// afterwards with the new password.
export async function setPassword(prev, formData) {
  const token = String(formData.get('token') || '');
  const password = String(formData.get('password') || '');
  const confirm = String(formData.get('confirm') || '');

  if (token.length < 16) return { error: 'This link has expired. Request a new one.' };
  if (password.length < 10 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return { error: 'Use at least 10 characters with upper case, lower case and a number.' };
  }
  if (password !== confirm) return { error: 'Passwords do not match.' };

  const result = await resetPassword(token, password);
  if (!result.ok) {
    return { error: result.status === 401 || result.status === 400 ? 'This link has expired. Request a new one.' : result.message || 'Could not set the password. Try again.' };
  }
  redirect('/login?message=password-updated');
}
