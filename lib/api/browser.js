import { COOKIES } from "@/config/api";
import { createApiClient } from "./core";
import { sessionFromToken } from "./tokens";

function read(name) {
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

// Client components (ResourcePage) fetch their own tables, so the access token has to be
// JS-readable. The refresh token stays httpOnly and is only ever spent by /api/session/refresh,
// which is why the browser delegates rotation to that same-origin route instead of calling the
// backend directly.
const store = {
  getAccessToken: () => read(COOKIES.access),
  getRefreshToken: () => "",
  hasRefresh: () => Boolean(read(COOKIES.present)),
  setAccessToken: (token) => {
    document.cookie = `${COOKIES.access}=${encodeURIComponent(token)}; path=/; max-age=${
      60 * 60 * 24
    }; samesite=lax`;
  },
  clear: () => {
    document.cookie = `${COOKIES.access}=; path=/; max-age=0`;
    document.cookie = `${COOKIES.present}=; path=/; max-age=0`;
  },
  refresh: async () => {
    try {
      const res = await fetch("/api/session/refresh", { method: "POST" });
      if (!res.ok) return "";
      const data = await res.json();
      return data.access_token || "";
    } catch {
      return "";
    }
  },
};

export const api = createApiClient(store);
export { ApiError } from "./core";

// Some backend transitions require the acting user's id in the body (maker/checker). It is read
// from the access JWT, which the backend already signed - the server re-checks authorization on
// every call, so this is a convenience value, not a trust boundary.
export const currentUserId = () =>
  Number(sessionFromToken(read(COOKIES.access))?.userId) || 0;
