import "server-only";
import { API_BASE_URL } from "@/config/api";

// The identity calls that must run on the server: they mint or destroy the httpOnly session cookies.
// Everything else goes through lib/api/browser.js or lib/api/server.js.

async function post(path, body, headers = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body ?? {}),
  }).catch(() => null);
  if (!res) return { ok: false, status: 0, data: null, code: undefined, message: "Cannot reach the API." };
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return {
    ok: res.ok,
    status: res.status,
    data,
    // The backend's AppError handler writes the stable identifier in `error` and the human
    // sentence in `message`; callers branch on the first and show the second.
    code: (data && data.error) || undefined,
    message: (data && (data.message || data.detail)) || `Request failed (${res.status})`,
  };
}

// POST /login uses OAuth2PasswordRequestForm, so it is form-urlencoded rather than JSON.
export async function loginRequest(email, password) {
  const form = new URLSearchParams({ username: email, password });
  const res = await fetch(`${API_BASE_URL}/api/identity/v1/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  }).catch(() => null);
  if (!res) return { ok: false, message: "Cannot reach the API." };
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      // The backend's AppError handler writes the stable identifier in `error`; `message` is
      // for people. The sign-in flow branches on the identifier, never on the wording.
      code: (data && data.error) || undefined,
      message: (data && (data.message || data.detail)) || "Invalid email or password.",
    };
  }
  return { ok: true, ...data };
}

export const requestPasswordReset = (email) =>
  post("/api/identity/v1/password/forgot", { email });

// Requires the token from the emailed link; the backend takes {token, new_password}.
export const resetPassword = (token, newPassword) =>
  post("/api/identity/v1/password/reset", { token, new_password: newPassword });

// MFAVerifyRequest carries mfa_token in the body, not as a Bearer header.
export const verifyMfa = (mfaToken, code) =>
  post("/api/identity/v1/mfa/verify", { mfa_token: mfaToken, code });

// When the platform insists on an authenticator for administrators, the sign-in itself refuses
// an account that has none. These two calls are how a refused account gets enrolled: credentials
// in, an authenticator challenge out, then the verified code opens the session.
export const startMfaEnrolment = (email, password) =>
  post("/api/identity/v1/mfa/enroll/start", { email, password });

export const completeMfaEnrolment = (enrollmentToken, code) =>
  post("/api/identity/v1/mfa/enroll/complete", {
    enrollment_token: enrollmentToken,
    code,
  });
