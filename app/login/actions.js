'use server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { ROLES, isApiConfigured } from '@/config/auth';
import { writeSession, clearSession, backendLogout } from '@/lib/api/server';
import { getRoleFromAccessToken } from '@/lib/auth/getRole';
import { loginRequest, requestPasswordReset as requestBackendReset, verifyMfa, startMfaEnrolment, completeMfaEnrolment } from '@/lib/auth/backend';
import { rateLimit } from '@/lib/rateLimit';

const ip = () => headers().get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

// An authenticator code, or one of the recovery codes issued when MFA was enrolled - which is
// the only way in for someone whose phone is gone.
const AUTHENTICATOR_CODE = /^\d{6}$/;
const RECOVERY_CODE = /^[0-9A-Za-z]{5}-?[0-9A-Za-z]{5}$/;
const acceptsCode = (code) => AUTHENTICATOR_CODE.test(code) || RECOVERY_CODE.test(code);

export async function signIn(prev, formData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');

  // Second step of an MFA login: the challenge token came from the backend and is replayed with the code.
  if (prev?.mfaRequired && prev.mfaToken) {
    const code = String(formData.get('code') || '').trim();
    if (!acceptsCode(code)) return { error: 'Enter the 6-digit code from your authenticator, or an unused recovery code.' };
    if (!rateLimit(`mfa:${ip()}:${email}`, 8, 5 * 60_000)) return { error: 'Too many attempts. Please wait a few minutes.' };
    const verified = await verifyMfa(prev.mfaToken, code);
    // post() keeps the parsed body under `data`; reading it off the wrapper was the reason a
    // correct code was always refused here.
    if (!verified.ok || !verified.data?.access_token) {
      return { error: verified.message || 'That code was not accepted. Sign in again.', mfaRequired: true, mfaToken: prev.mfaToken };
    }
    return completeLogin(verified.data);
  }

  // The authenticator an account enrolled at the door, confirmed.
  if (prev?.enroll?.enrollmentToken) {
    const code = String(formData.get('code') || '').trim();
    // Only a live authenticator code counts here: an account at the enrolment door has no
    // recovery codes yet, and a digit-string would otherwise be accepted and then refused.
    if (!AUTHENTICATOR_CODE.test(code)) return { error: 'Enter the 6-digit code from your authenticator.', enroll: prev.enroll };
    if (!rateLimit(`enroll:${ip()}:${email}`, 8, 5 * 60_000)) return { error: 'Too many attempts. Please wait a few minutes.', enroll: prev.enroll };
    const done = await completeMfaEnrolment(prev.enroll.enrollmentToken, code);
    if (!done.ok || !done.data?.access_token) {
      // The same challenge stays valid until the backend's own expiry, so a mistyped code
      // must not throw away the scan the operator just did.
      return {
        error: done.code === 'mfa_invalid'
          ? 'That code was not accepted. Try the one showing right now.'
          : done.message || 'Enrolment could not be completed. Sign in again.',
        enroll: prev.enroll,
      };
    }
    return completeLogin(done.data, done.data.recovery_codes);
  }

  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 6) return { error: 'Enter a valid email and password.' };
  if (!isApiConfigured()) return { error: 'Sign-in is not available right now. Contact your administrator.' };
  if (!rateLimit(`login:${ip()}:${email}`, 8, 5 * 60_000)) return { error: 'Too many attempts. Please wait a few minutes.' };

  const result = await loginRequest(email, password);
  if (!result.ok) {
    // Never log a session in on a failed response.
    clearSession();

    // The platform policy refuses an administrator who has no authenticator. That refusal is
    // the only door to enrolment, so follow it: the same credentials, offered as a challenge
    // instead of a session.
    if (result.code === 'mfa_enrollment_required') {
      if (!rateLimit(`enroll:${ip()}:${email}`, 5, 5 * 60_000)) return { error: 'Too many attempts. Please wait a few minutes.' };
      const started = await startMfaEnrolment(email, password);
      if (!started.ok || !started.data?.enrollment_token) {
        return { error: started.message || 'Your account has no authenticator and enrolment could not start. Contact a Super Admin.' };
      }
      const s = started.data.setup || {};
      return {
        enroll: {
          enrollmentToken: started.data.enrollment_token,
          secret: s.secret,
          qrSvg: s.qr_svg,
          account: s.account,
          expiresInSeconds: started.data.expires_in,
        },
      };
    }

    return { error: result.message || 'Invalid email or password.' };
  }

  // The backend defers the access token until the authenticator code is supplied.
  if (result.mfa_required) {
    if (!result.mfa_token) return { error: 'This account needs an MFA code, but the challenge could not start. Contact a Super Admin.' };
    return { mfaRequired: true, mfaToken: result.mfa_token };
  }

  return completeLogin(result);
}

async function completeLogin(token, recoveryCodes) {
  writeSession({
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresIn: token.expires_in,
  });
  // Read the role from the backend-signed token, never from the form.
  const role = getRoleFromAccessToken(token.access_token);
  if (!role || !ROLES[role]) {
    clearSession();
    return { error: 'Your account is inactive or has no assigned dashboard. Contact a Super Admin.' };
  }

  // Freshly minted recovery codes exist only in this response. Redirecting straight to the
  // dashboard would drop the one copy the operator was never shown, so the form is held here
  // until they have them; the session is already written, so nothing is lost by leaving.
  if (recoveryCodes?.length) {
    return { enrolled: { recoveryCodes, home: ROLES[role].home } };
  }

  redirect(ROLES[role].home);
}

export async function signOut() {
  await backendLogout();
  clearSession();
  redirect('/login');
}

// Same response whether or not the email exists, so accounts cannot be enumerated.
export async function requestPasswordReset(email) {
  const generic = { message: 'If an account exists for this email, a reset link has been sent.' };
  const e = String(email || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(e) || !isApiConfigured()) return generic;
  if (!rateLimit(`reset:${ip()}:${e}`, 3, 15 * 60_000)) return generic;
  await requestBackendReset(e);
  return generic;
}
