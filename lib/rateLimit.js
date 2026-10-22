// Per-instance sliding window. Good for basic abuse protection; for multi-instance deployments use a shared store (e.g. Upstash Redis).
const hits = new Map();
export function rateLimit(key, max = 10, windowMs = 60_000) {
  const now = Date.now(); const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= max) { hits.set(key, arr); return false; }
  arr.push(now); hits.set(key, arr); return true;
}
