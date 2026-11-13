import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { API_BASE_URL, COOKIES } from "@/config/api";
import { writeSession, clearSession } from "@/lib/api/server";

// Rotates the backend session for browser code, which cannot read the httpOnly refresh cookie
// itself. Only the access token is returned to the client; the refresh token stays server-side.
export async function POST() {
  const refreshToken = cookies().get(COOKIES.refresh)?.value;
  if (!refreshToken) {
    clearSession();
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }

  const res = await fetch(`${API_BASE_URL}/api/identity/v1/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  }).catch(() => null);

  if (!res || !res.ok) {
    clearSession();
    return NextResponse.json(
      { error: res ? `refresh_failed_${res.status}` : "network_error" },
      { status: 401 },
    );
  }

  const data = await res.json();
  writeSession({
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  });
  return NextResponse.json({
    access_token: data.access_token,
    expires_in: data.expires_in,
  });
}
