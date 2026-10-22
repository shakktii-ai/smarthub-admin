import { getBrowserClient } from '@/lib/supabase/client';
import { DATE_COLUMNS, SEARCH_COLUMNS, TABLES } from '@/config/tableMap';

const snake = (s) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const camel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
const camelRow = (r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [camel(k), v]));
const snakeObj = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [snake(k), v]));
const table = (r) => TABLES[r] || r;
const todo = (n) => async () => { throw new Error(`${n} is not connected yet. Create a Supabase view/RPC for it and implement it in services/supabase.`); };

export async function listRecords(resource, { tab, tabField, search = '', filters = {}, base = {}, page = 1, pageSize = 10, range } = {}) {
  const sb = getBrowserClient(); const t = table(resource);
  const scope = (q) => {
    Object.entries({ ...base, ...filters }).forEach(([k, v]) => { if (v) q = q.eq(snake(k), v); });
    const dc = DATE_COLUMNS[resource]; if (range && dc) q = q.gte(dc, range.from).lte(dc, `${range.to}T23:59:59`);
    const s = search.trim().replace(/[,%()]/g, ' '); const sc = SEARCH_COLUMNS[resource];
    if (s && sc) q = q.or(sc.map((c) => `${c}.ilike.%${s}%`).join(','));
    return q;
  };
  const counts = {};
  if (tabField) { const { data } = await scope(sb.from(t).select(snake(tabField))); (data || []).forEach((r) => { const v = r[snake(tabField)]; counts[v] = (counts[v] || 0) + 1; }); } // for large tables use an RPC/view instead
  let q = scope(sb.from(t).select('*', { count: 'exact' }));
  if (tabField && tab && tab !== 'All') q = q.eq(snake(tabField), tab);
  const { data, count, error } = await q.range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw error;
  const rows = (data || []).map(camelRow);
  return { rows, total: count ?? 0, all: tabField ? Object.values(counts).reduce((a, b) => a + b, 0) : count ?? 0, counts, allRows: rows };
}
export async function getFilterOptions(resource, key) {
  const { data } = await getBrowserClient().from(table(resource)).select(snake(key));
  return [...new Set((data || []).map((r) => r[snake(key)]).filter(Boolean))].sort();
}
export async function createRecord(resource, values, cfg = {}) {
  const { id, iso, ...defaults } = cfg.defaults || {}; // mock-only keys are dropped
  const row = snakeObj({ ...defaults, ...values });
  (cfg.numeric || []).forEach((k) => { row[snake(k)] = Number(row[snake(k)]); });
  const { data, error } = await getBrowserClient().from(table(resource)).insert(row).select().single();
  if (error) throw error;
  return camelRow(data);
}
export async function performAction(resource, id, action) {
  const { data, error } = await getBrowserClient().from(table(resource)).update({ status: action.setStatus }).eq('id', id).select().single();
  if (error) throw error;
  return camelRow(data);
}
export async function getMerchant(id) {
  const { data, error } = await getBrowserClient().from(table('merchants')).select('*').eq('id', id).single();
  if (error) throw error;
  return camelRow(data);
}
export async function updateMerchant(id, patch) {
  const { data, error } = await getBrowserClient().from(table('merchants')).update(snakeObj(patch)).eq('id', id).select().single();
  if (error) throw error;
  return camelRow(data);
}
export const getApplication = getMerchant;
export const getDashboard = todo('getDashboard'); export const getRecentFeeds = todo('getRecentFeeds'); export const getOnboardingOverview = todo('getOnboardingOverview');
export const addApplication = todo('addApplication'); export const verifyDocument = todo('verifyDocument'); export const runPennyDrop = todo('runPennyDrop');
export const approveApplication = todo('approveApplication'); export const rejectApplication = todo('rejectApplication');
export const getCollectionDashboard = todo('getCollectionDashboard'); export const collectEmi = todo('collectEmi'); export const getSuperAdminDashboard = todo('getSuperAdminDashboard');
