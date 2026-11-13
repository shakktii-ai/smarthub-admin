// Backend connection settings. Mock data is now opt-in: set NEXT_PUBLIC_USE_MOCKS=true to restore it.
export const API_CONFIG = {
  useMocks: process.env.NEXT_PUBLIC_USE_MOCKS === "true",
  mockDelayMs: 350,
};

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"
).replace(/\/+$/, "");

// The dashboard talks to the FastAPI backend. Shared by browser code and server code.
export const COOKIES = {
  // Readable by JS: ResourcePage is a client component and attaches this as a Bearer token.
  access: "shp_access",
  // httpOnly: only /api/session/refresh and server code read it.
  refresh: "shp_refresh",
  // Non-secret marker so browser code and middleware know an httpOnly refresh cookie exists.
  present: "shp_session",
};
