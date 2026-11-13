'use server';

import { revalidatePath } from 'next/cache';
import { authorize } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rateLimit';

const MFA = '/api/identity/v1/mfa';

// Any signed-in administrator owns this screen: it is about their own account, so there is no
// role list to pass to authorize().
async function guard(scope, limit = 10) {
  const a = await authorize();
  if (a.error) {
    return { error: a.error };
  }
  if (!rateLimit(`mfa-${scope}:${a.profile.id}`, limit)) {
    return { error: 'Too many attempts. Please wait a minute.' };
  }
  return a;
}

const asReason = (error, fallback) =>
  error?.status === 401 && error.code === 'password_invalid'
    ? 'That password is not correct.'
    : error?.code === 'mfa_invalid'
      ? 'That code is not valid right now. Use the 6 digits showing in your authenticator, or an unused recovery code.'
      : error?.message || fallback;

export async function getMfaSummary() {
  const a = await authorize();
  if (a.error) {
    return { error: a.error };
  }
  try {
    const status = await a.api.get(`${MFA}/status`);
    return {
      enabled: Boolean(status?.enabled),
      enrolledAt: status?.enrolled_at || null,
      recoveryCodesRemaining: status?.recovery_codes_remaining || 0,
      requiredByPolicy: Boolean(status?.required_by_policy),
    };
  } catch (error) {
    return { error: error.message || 'Could not read your MFA status.' };
  }
}

export async function startSetup() {
  const a = await guard('setup', 5);
  if (a.error) {
    return { error: a.error };
  }
  try {
    const setup = await a.api.post(`${MFA}/setup`, {});
    return {
      secret: setup.secret,
      otpauthUri: setup.otpauth_uri,
      issuer: setup.issuer,
      account: setup.account,
      qrSvg: setup.qr_svg,
    };
  } catch (error) {
    if (error.code === 'mfa_already_enabled') {
      return { error: 'An authenticator is already enrolled on this account. Remove it first.' };
    }
    return { error: error.message || 'Could not start authenticator setup.' };
  }
}

// The response carries the recovery codes and this is the only time the backend ever sends them,
// so the caller must show them before anything else can happen.
export async function enableAuthenticator(code) {
  const a = await guard('enable', 8);
  if (a.error) {
    return { error: a.error };
  }
  const digits = String(code || '').trim();
  if (!/^\d{6,8}$/.test(digits)) {
    return { error: 'Enter the 6-digit code from your authenticator.' };
  }
  try {
    const res = await a.api.post(`${MFA}/enable`, { code: digits });
    revalidatePath('/account/security');
    return { ok: true, recoveryCodes: res.recovery_codes || [] };
  } catch (error) {
    return { error: asReason(error, 'Could not verify that code.') };
  }
}

export async function disableAuthenticator(password, code) {
  const a = await guard('disable', 5);
  if (a.error) {
    return { error: a.error };
  }
  try {
    await a.api.post(`${MFA}/disable`, {
      password: String(password || ''),
      code: String(code || '').trim() || null,
    });
    revalidatePath('/account/security');
    return { ok: true };
  } catch (error) {
    return { error: asReason(error, 'Could not remove the authenticator.') };
  }
}

export async function replaceRecoveryCodes(password, code) {
  const a = await guard('recovery', 5);
  if (a.error) {
    return { error: a.error };
  }
  try {
    const res = await a.api.post(`${MFA}/recovery-codes`, {
      password: String(password || ''),
      code: String(code || '').trim(),
    });
    revalidatePath('/account/security');
    return { ok: true, recoveryCodes: res.recovery_codes || [] };
  } catch (error) {
    return { error: asReason(error, 'Could not issue new recovery codes.') };
  }
}
