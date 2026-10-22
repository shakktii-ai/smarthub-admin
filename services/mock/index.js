import { DB, DASHBOARD, ONBOARD_TREND } from '@/data/mock';
import { API_CONFIG } from '@/config/api';
import { COLLECTION_DB, COLLECTION_TREND } from '@/data/collectionMock';
import { SA_DB } from '@/data/superAdminMock';
import { inr } from '@/lib/format';

const T = (r) => DB[r] || COLLECTION_DB[r] || SA_DB[r] || [];

const delay = (v) => new Promise((res) => setTimeout(() => res(v), API_CONFIG.mockDelayMs));

/** @param {string} resource @param {import('../types').ListParams} p @returns {Promise<import('../types').ListResult>} */
export async function listRecords(resource, p = {}) {
  const { tab, tabField, search = '', filters = {}, base = {}, page = 1, pageSize = 10, range } = p;
  let rows = T(resource) || [];
  const eq = (obj) => (row) => Object.entries(obj).every(([k, v]) => !v || String(row[k]) === v);
  rows = rows.filter(eq(base)).filter(eq(filters));
  if (range && rows[0]?.iso) rows = rows.filter((r) => r.iso >= range.from && r.iso <= range.to);
  const q = search.trim().toLowerCase();
  if (q) rows = rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(q)));
  const counts = {};
  if (tabField) rows.forEach((r) => { counts[r[tabField]] = (counts[r[tabField]] || 0) + 1; });
  const all = rows.length;
  if (tabField && tab && tab !== 'All') rows = rows.filter((r) => r[tabField] === tab);
  return delay({ rows: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length, all, counts, allRows: rows });
}

export function getFilterOptions(resource, key) {
  return [...new Set((T(resource) || []).map((r) => r[key]))].sort();
}

export async function createRecord(resource, values, cfg = {}) {
  const row = { id: `${resource.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`, ...cfg.defaults, ...values };
  if (cfg.idPrefix) row.id = cfg.idPrefix + String(Date.now()).slice(-5);
  (cfg.numeric || []).forEach((k) => { row[k] = Number(row[k]); });
  if (cfg.defaults?.id) row.id = `${cfg.defaults.id.slice(0, -2)}${String(T(resource).length % 90 + 10)}`;
  if (resource === 'merchants') row.id = `MRC-${String(1300 + DB.merchants.length).padStart(6, '0')}`;
  T(resource).unshift(row);
  return delay(row);
}

// Frontend simulation only: no payment, refund, KYC or settlement is executed.
export async function performAction(resource, id, action) {
  const row = T(resource).find((r) => r.id === id);
  if (!row) throw new Error('Record not found');
  const field = T(resource)[0].status !== undefined ? 'status' : null;
  if (field && action.setStatus) row[field] = action.setStatus;
  return delay({ ...row });
}

export async function getDashboard() { return delay(DASHBOARD); }
export async function getRecentFeeds() {
  return delay({ onboardings: DB.onboarding.slice(0, 5), transactions: DB.transactions.slice(0, 5) });
}

// ---- Onboarding / KYC (frontend simulation only: no real KYC, penny drop or approval happens) ----
const app = (id) => { const a = DB.onboarding.find((x) => x.id === id); if (!a) throw new Error('Application not found'); return a; };
export async function getOnboardingOverview() {
  const rows = DB.onboarding; const counts = {};
  rows.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
  const open = rows.filter((r) => !['Approved', 'Rejected', 'Draft'].includes(r.status));
  return delay({ total: rows.length, counts, trend: ONBOARD_TREND, recent: rows.slice(0, 5), pendingDocs: open.filter((r) => r.documents.some((d) => d.status === 'Uploaded')).length, pendingBank: open.filter((r) => r.bankStatus !== 'Verified').length });
}
export async function getApplication(id) { return delay(structuredClone(app(id))); }
export async function addApplication(v, submit = true) {
  const row = { id: `APP-202610-${String(DB.onboarding.length + 1).padStart(3, '0')}`, merchant: v.tradeName || 'Untitled merchant', category: v.category || '-', mobile: v.mobile || '-', salesStaff: 'Head Office (Assisted)', appliedOn: 'Oct 10, 2026', iso: '2026-10-10', status: submit ? 'Under Review' : 'Draft', legalName: v.legalName || '-', owner: v.ownerName || '-', gstin: v.gstin || '-', address: [v.address1, v.city, v.state].filter(Boolean).join(', '), bankName: v.bankName || '-', accountNo: `**** **** ${String(v.accountNo || '').slice(-4)}`, ifsc: v.ifsc || '-', bankStatus: v.bankVerified ? 'Verified' : 'Pending', rejectionReason: '', documents: [['PAN Card', v.pan], ['Aadhaar Card', v.aadhaar], ['Business Registration', v.reg], ['GST Certificate', v.gst]].filter(([, f]) => f).map(([name, file]) => ({ name, file, status: 'Uploaded', remarks: '' })) };
  DB.onboarding.unshift(row); return delay(row);
}
export async function verifyDocument(id, name, status, remarks) { const d = app(id).documents.find((x) => x.name === name); d.status = status; d.remarks = remarks; return delay(structuredClone(app(id))); }
export async function runPennyDrop(id) { Object.assign(app(id), { bankStatus: 'Verified', pennyRef: `PD-${Date.now().toString().slice(-6)}`, pennyOn: 'Oct 10, 2026' }); return delay(structuredClone(app(id))); }
export async function approveApplication(id) {
  const a = app(id);
  if (a.bankStatus !== 'Verified' || a.documents.some((d) => d.status !== 'Valid')) throw new Error('Verify all documents and the bank account before approving');
  a.merchantId = `MRC-${String(1300 + DB.merchants.length).padStart(6, '0')}`; a.status = 'Approved'; a.approvedOn = 'Oct 10, 2026';
  DB.merchants.unshift({ id: a.merchantId, name: a.merchant, category: a.category, city: a.address.split(', ').slice(-1)[0], mobile: a.mobile, salesStaff: a.salesStaff, volume: 0, transactions: 0, status: 'Active', iso: '2026-10-10' });
  return delay(structuredClone(a));
}
export async function rejectApplication(id, reason, remarks) { const a = app(id); a.status = 'Rejected'; a.rejectionReason = `${reason}: ${remarks}`; return delay(structuredClone(a)); }

// ---- Collection Admin (frontend simulation: no real payment is collected) ----
export async function getCollectionDashboard() {
  const C = COLLECTION_DB; const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
  const due = sum(C.c_emi.filter((e) => ['Due', 'Paid', 'Overdue'].includes(e.status)), (e) => e.emi);
  const collected = sum(C.c_payments.filter((p) => p.status === 'Success'), (p) => p.amount);
  const overdue = sum(C.c_overdue, (o) => o.overdue);
  const counts = {}; C.c_loans.forEach((l) => { counts[l.status] = (counts[l.status] || 0) + 1; });
  const dueToday = C.c_emi.filter((e) => e.status === 'Due');
  return delay({
    stats: [
      { label: 'Total Loan Portfolio', value: inr(sum(C.c_loans, (l) => l.outstanding)), delta: '8.4%', up: true, color: 'blue' },
      { label: 'Total Due This Month', value: inr(due), delta: '6.2%', up: false, color: 'amber' },
      { label: 'Collected This Month', value: inr(collected), delta: '14.3%', up: true, color: 'green' },
      { label: 'Overdue Amount', value: inr(overdue), delta: '12.5%', up: false, color: 'red' },
      { label: 'Collection Rate', value: `${Math.min(100, Math.round((collected / due) * 100))}%`, delta: '6.1%', up: true, color: 'purple' },
      { label: 'Active Borrowers', value: String(C.c_borrowers.filter((b) => b.status === 'Active').length), delta: '3.2%', up: true, color: 'blue' } ],
    trend: COLLECTION_TREND,
    aging: C.c_aging.map((a, i) => ({ name: a.bucket, value: a.amount, share: a.share, color: ['#D64545', '#FF9F1C', '#F5C84C', '#8B5CF6'][i] })),
    loanStatus: Object.entries(counts).map(([name, value]) => ({ name, value, color: { Active: '#1E9E6A', Overdue: '#FF9F1C', Closed: '#94A3B8', NPA: '#2F6FED' }[name] })),
    totalOverdue: overdue, totalLoans: C.c_loans.length,
    recentPayments: C.c_payments.slice(0, 5), topOverdue: [...C.c_overdue].sort((a, b) => b.overdue - a.overdue).slice(0, 5),
    dueToday: dueToday.slice(0, 5), dueTodayCount: dueToday.length, agents: C.c_agents.slice(0, 5),
  });
}
export async function collectEmi(id) {
  const e = COLLECTION_DB.c_emi.find((x) => x.id === id); if (!e) throw new Error('EMI not found');
  e.status = 'Paid';
  COLLECTION_DB.c_payments.unshift({ id: `PAY-${Date.now().toString().slice(-5)}`, dateTime: 'Oct 10, 2026 05:30 PM', iso: '2026-10-10', borrower: e.borrower, loan: e.loan, amount: e.emi, method: 'UPI', status: 'Success', receiptNo: `RC-${Date.now().toString().slice(-6)}` });
  return delay(e);
}

// ---- Merchant detail (frontend simulation) ----
export async function getMerchant(id) { const m = DB.merchants.find((x) => x.id === id); if (!m) throw new Error('Merchant not found'); return delay(structuredClone(m)); }
export async function updateMerchant(id, patch) {
  const m = DB.merchants.find((x) => x.id === id); if (!m) throw new Error('Merchant not found');
  Object.assign(m, patch); if (patch.status) m.history.push({ date: 'Oct 10, 2026', event: `Status changed to ${patch.status}`, by: 'Amit Sharma' });
  return delay(structuredClone(m));
}

// ---- Super Admin (frontend simulation) ----
export async function getSuperAdminDashboard() {
  const sum = (a, f) => a.reduce((s, x) => s + f(x), 0); const C = COLLECTION_DB; const S = SA_DB;
  const roles = {}; S.sa_users.forEach((u) => { roles[u.dashboard] = (roles[u.dashboard] || 0) + 1; });
  return delay({
    stats: [
      { label: 'Merchant GMV (sample)', value: inr(sum(DB.transactions.filter((t) => t.status === 'Success'), (t) => t.amount)), color: 'blue' },
      { label: 'Active Merchants', value: String(DB.merchants.filter((m) => m.status === 'Active').length), color: 'green' },
      { label: 'Loan Portfolio', value: inr(sum(C.c_loans, (l) => l.outstanding)), color: 'purple' },
      { label: 'Pending Approvals', value: String(S.sa_maker.filter((x) => x.status === 'Pending').length), color: 'amber' },
      { label: 'Open Risk Alerts', value: String(S.sa_risk.filter((x) => x.status === 'Open').length), color: 'red' },
      { label: 'Recon Exceptions', value: String(DB.recon.filter((x) => x.status === 'Exception').length + C.c_recon.filter((x) => x.status === 'Exception').length), color: 'amber' } ],
    rolesDist: Object.entries(roles).map(([name, value], i) => ({ name, value, color: ['#0F2440', '#1B8AA6', '#FF9F1C', '#1E9E6A'][i % 4] })),
    pending: S.sa_maker.filter((x) => x.status === 'Pending').slice(0, 5), audit: S.sa_audit.slice(0, 5),
  });
}
