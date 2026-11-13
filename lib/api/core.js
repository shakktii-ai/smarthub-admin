import { API_BASE_URL } from "@/config/api";
import { sessionFromToken, isExpired, decodeToken } from "./tokens";

export class ApiError extends Error {
  constructor(message, { status = 0, code = "network_error" } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function buildQuery(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  const q = sp.toString();
  return q ? `?${q}` : "";
}

// Endpoints that establish or end a session. A 401 from these is the answer, not a stale
// access token, so they must not trigger a refresh-and-replay. The identity prefix is not a
// usable shortcut because the administrator list and status routes live under it too.
const SESSION_PATHS = [
  "/api/identity/v1/login",
  "/api/identity/v1/register",
  "/api/identity/v1/refresh",
  "/api/identity/v1/logout",
  "/api/identity/v1/logout-all",
  "/api/identity/v1/otp/",
  "/api/identity/v1/mfa/verify",
  "/api/identity/v1/password/",
  "/api/identity/v1/email/verify",
];

const isSessionPath = (path) => SESSION_PATHS.some((p) => path.startsWith(p));

/**
 * Build an API client over a cookie store.
 * `store` must expose get/set/clear for the access token and get for the refresh token,
 * with different implementations on the browser (document.cookie) and the server
 * (next/headers), because ResourcePage fetches from the client while server actions fetch
 * from Node. Keeping the transport here means both halves share one error contract.
 */
export function createApiClient(store) {
  // On the server this trades the httpOnly refresh cookie directly. In the browser it delegates
  // to a same-origin route handler, because document.cookie cannot see httpOnly cookies.
  async function refreshAccessToken() {
    if (store.refresh) return store.refresh();
    const refreshToken = store.getRefreshToken();
    if (!refreshToken) return "";
    const res = await fetch(`${API_BASE_URL}/api/identity/v1/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) {
      store.clear();
      return "";
    }
    const data = await res.json();
    if (data.access_token) store.setAccessToken(data.access_token);
    return data.access_token || "";
  }

  async function send(path, init, allowRefresh, raw, multipart) {
    const token = store.getAccessToken();
    const headers = { Accept: "application/json", ...(init.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    // A FormData body must keep its generated Content-Type, boundary included.
    if (init.body !== undefined && !multipart && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    let res;
    try {
      res = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers,
        credentials: "include",
      });
    } catch {
      throw new ApiError(`Cannot reach the API at ${API_BASE_URL}.`, {
        code: "network_error",
      });
    }

    // An expired-but-readable access cookie is normal; refresh once and replay.
    if (
      allowRefresh !== false &&
      res.status === 401 &&
      !isSessionPath(path)
    ) {
      const fresh = await refreshAccessToken();
      if (fresh) return send(path, init, false, raw, multipart);
    }

    if (res.status === 204) return null;

    // A KYC document is bytes, and an <img> tag cannot carry an Authorization header, so the
    // panel proxies them through a same-origin route handler. That handler needs the body and
    // the two headers that decide how the browser shows it - not a JSON parse.
    if (raw === "bytes") {
      const buffer = await res.arrayBuffer();
      if (!res.ok) {
        let message = `Request failed (${res.status})`;
        let code = `http_${res.status}`;
        try {
          const payload = JSON.parse(new TextDecoder().decode(buffer));
          const detail = payload?.message ?? payload?.detail;
          if (typeof detail === "string") message = detail;
          code = payload?.error || payload?.code || code;
        } catch {
          // The body was the document itself, so there is no error message to read.
        }
        throw new ApiError(message, { status: res.status, code });
      }
      return {
        bytes: buffer,
        contentType: res.headers.get("content-type") || "application/octet-stream",
        disposition: res.headers.get("content-disposition") || "",
      };
    }

    const text = await res.text();
    if (raw) {
      if (!res.ok) {
        throw new ApiError(`Request failed (${res.status})`, {
          status: res.status,
          code: `http_${res.status}`,
        });
      }
      return text;
    }
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = null;
    }

    if (!res.ok) {
      // Two error shapes coexist on the backend: {"error","message"} and {"detail"}.
      const raw = payload && (payload.message ?? payload.detail);
      const message =
        typeof raw === "string"
          ? raw
          : raw
            ? JSON.stringify(raw)
            : `Request failed (${res.status})`;
      throw new ApiError(message, {
        status: res.status,
        code: (payload && (payload.error || payload.code)) || `http_${res.status}`,
      });
    }
    return payload;
  }

  return {
    ApiError,
    get: (path, params) => send(`${path}${buildQuery(params)}`, { method: "GET" }),
    // Generated report files come back as CSV text, which must not be JSON-parsed.
    getText: (path) => send(path, { method: "GET" }, undefined, true),
    // Stored documents (KYC files) come back as bytes for the route handler to relay.
    getBlob: (path) => send(path, { method: "GET" }, undefined, "bytes"),
    // `headers` is for the few endpoints that demand one, e.g. Idempotency-Key on refunds.
    post: (path, body, params, headers) =>
      send(`${path}${buildQuery(params)}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body ?? {}),
      }),
    // Some PATCH routes scope the key in the query rather than the body (settings), so the
    // caller can pass query params the same way the list and create calls do.
    patch: (path, body, params) =>
      send(`${path}${buildQuery(params)}`, {
        method: "PATCH",
        body: JSON.stringify(body ?? {}),
      }),
    // Image and document uploads. The backend reads these as multipart form
    // fields, which only the browser can frame because of the boundary.
    upload: (path, form) =>
      send(path, { method: "POST", body: form }, undefined, undefined, true),
    // PUT replaces a whole record, which is how /api/settings/v1/{key} upserts a setting.
    put: (path, body, params) =>
      send(`${path}${buildQuery(params)}`, {
        method: "PUT",
        body: JSON.stringify(body ?? {}),
      }),
    // DELETE /api/settings/v1/{key} needs ?scope=merchant, so deletes take query params too.
    del: (path, params) =>
      send(`${path}${buildQuery(params)}`, { method: "DELETE" }),
    // POST /login uses OAuth2PasswordRequestForm, which is form-urlencoded.
    loginForm: (path, fields) => {
      const form = new URLSearchParams();
      Object.entries(fields).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") form.set(k, String(v));
      });
      return send(path, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
    },
    session: () => sessionFromToken(store.getAccessToken() || ""),
    // True when we can still authorise: a live access token, or a refresh token to trade.
    hasUsableSession: () => {
      const access = store.getAccessToken();
      if (access) {
        const s = sessionFromToken(access);
        if (s && !s.expired) return true;
      }
      if (store.hasRefresh) return store.hasRefresh();
      const rp = decodeToken(store.getRefreshToken() || "");
      return Boolean(rp && !isExpired(rp));
    },
    store,
  };
}
