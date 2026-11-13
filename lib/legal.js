import { API_BASE_URL } from "@/config/api";

// The landing pages are anonymous, so this reads the public legal route with plain fetch:
// using the authenticated client would pull the cookie store into a page that has no session.
// Returns null when nothing is published (404) or the backend is unreachable, which keeps the
// copy shipped with the page on screen instead of rendering a blank document.
export async function getPublishedLegalDocument(docType) {
  try {
    const res = await fetch(`${API_BASE_URL}/api/legal/v1/public/${docType}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const doc = await res.json();
    return Array.isArray(doc?.content) && doc.content.length ? doc : null;
  } catch {
    return null;
  }
}
