import "server-only";
import { cookies } from "next/headers";
import { API_BASE_URL, COOKIES } from "@/config/api";
import { createApiClient } from "./core";
import { decodeToken } from "./tokens";

const oneDay = 60 * 60 * 24;
const cookieOptions = (maxAge) => ({
  path: "/",
  maxAge,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
});

// Match the cookie to the refresh token's own exp claim so the browser drops it when the
// backend would reject it anyway.
const refreshCookieAge = (refreshToken) => {
  const payload = decodeToken(refreshToken);
  const seconds = payload?.exp ? Math.floor(payload.exp - Date.now() / 1000) : 0;
  return seconds > 0 ? seconds : oneDay * 7;
};

// Server-side store. Reading is allowed anywhere on the server; writing only inside a Server
// Action or Route Handler, which is exactly where login/refresh/logout run.
const store = {
  getAccessToken: () => cookies().get(COOKIES.access)?.value || "",
  getRefreshToken: () => cookies().get(COOKIES.refresh)?.value || "",
  hasRefresh: () => Boolean(cookies().get(COOKIES.refresh)?.value),
  setAccessToken: (token) => cookies().set(COOKIES.access, token, cookieOptions(oneDay)),
  clear: () => {
    cookies().delete(COOKIES.access);
    cookies().delete(COOKIES.refresh);
    cookies().delete(COOKIES.present);
  },
};

export const serverApi = createApiClient(store);
export { ApiError } from "./core";

// Persist a backend token pair. `expiresIn` is the ACCESS token lifetime (the identity service
// returns access_token_expire_minutes * 60), so it must not be used for the refresh cookie.
export function writeSession({ accessToken, refreshToken, expiresIn }) {
  const jar = cookies();
  if (accessToken) {
    jar.set(COOKIES.access, accessToken, cookieOptions(expiresIn || oneDay));
  }
  if (refreshToken) {
    const refresh = refreshCookieAge(refreshToken);
    jar.set(COOKIES.refresh, refreshToken, {
      ...cookieOptions(refresh),
      httpOnly: true,
    });
    // Non-secret marker so client code and middleware can tell a session exists.
    jar.set(COOKIES.present, "1", cookieOptions(refresh));
  }
}

export function clearSession() {
  store.clear();
}

export async function backendLogout() {
  const refreshToken = store.getRefreshToken();
  if (!refreshToken) return;
  await fetch(`${API_BASE_URL}/api/identity/v1/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  }).catch(() => {});
}
