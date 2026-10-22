// Mock data for Super Admin (users, roles, maker-checker, audit, risk, ledger, config, legal, partners). Development only.
const d = (n) => `Oct ${String(n).padStart(2, "0")}, 2026`;
const iso = (n) => `2026-10-${String(n).padStart(2, "0")}`;
const ROLE_LIST = [
  ["Super Admin", "super_admin", "Super Admin"],
  ["Merchant Admin", "merchant_admin", "Merchant Admin"],
  ["Collection Admin", "collection_admin", "Collection Admin"],
  ["UPI Admin", "upi_admin", "UPI Admin"],
];
const NAMES = [
  "Amit Sharma",
  "Meera Iyer",
  "Rohan Desai",
  "Kavita Rao",
  "Imran Sheikh",
  "Deepak Joshi",
  "Sana Qureshi",
  "Nikhil Patil",
  "Anjali Kulkarni",
  "Vivek Nair",
  "Pallavi More",
  "Sanjay Gupta",
];
const FUNC = [
  "Compliance / Risk",
  "Finance",
  "Operations",
  "Support",
  "Maker",
  "Checker",
  "Auditor",
];

const sa_users = NAMES.map((name, i) => ({
  id: `USR-${101 + i}`,
  name,
  email: `${name.split(" ")[0].toLowerCase()}@smarthubpay.in`,
  role: ROLE_LIST[i % 4][1],
  dashboard: ROLE_LIST[i % 4][2],
  function: i === 0 ? "Super Admin" : FUNC[i % 7],
  mfa: i === 9 ? "Not set" : "Enabled",
  lastLogin: d(10 - (i % 6)),
  status: i === 9 ? "Inactive" : "Active",
}));
const sa_maker = [
  "Settlement hold",
  "MDR change",
  "Manual adjustment",
  "Merchant suspension",
  "Refund override",
  "Commission change",
].flatMap((action, i) =>
  [0, 1].map((k) => ({
    id: `MC-${300 + i * 2 + k}`,
    action,
    target: [
      "ST-20261029-02",
      "Retail Stores",
      "TXN78489",
      "MRC-001246",
      "TXN78487",
      "Sales slab",
    ][i],
    dashboard: [
      "Merchant Admin",
      "Merchant Admin",
      "Merchant Admin",
      "Merchant Admin",
      "Collection Admin",
      "Merchant Admin",
    ][i],
    maker: NAMES[(i + k) % 12],
    requestedOn: d(10 - k - (i % 3)),
    status:
      (i + k) % 5 === 0
        ? "Approved"
        : (i + k) % 7 === 3
          ? "Rejected"
          : "Pending",
  })),
);
const sa_audit = Array.from({ length: 24 }, (_, i) => ({
  id: `AUD-${9000 + i}`,
  time: `${d(10 - Math.floor(i / 4))} ${String(9 + (i % 9)).padStart(2, "0")}:${String((i * 13) % 60).padStart(2, "0")}`,
  iso: iso(10 - Math.floor(i / 4)),
  user: NAMES[i % 12],
  action: [
    "Login",
    "Merchant approved",
    "Settlement hold approved",
    "Role changed",
    "Config updated",
    "Refund processed",
    "Legal text published",
  ][i % 7],
  entity: [
    "Session",
    "MRC-001248",
    "ST-20261029-02",
    "USR-105",
    "MDR (UPI)",
    "TXN78487",
    "Privacy Notice v2",
  ][i % 7],
  ip: `192.168.1.${20 + (i % 9)}`,
  change: [
    "-",
    "Under Review → Approved",
    "Open → Held",
    "Support → Checker",
    "0.30% → 0.00%",
    "Success → Refunded",
    "v1 → v2",
  ][i % 7],
}));
const sa_risk = Array.from({ length: 12 }, (_, i) => ({
  id: `RSK-${i + 1}`,
  merchant: [
    "Fresh Mart",
    "Urban Foods",
    "Maya Stores",
    "Daily Needs",
    "Chai Point",
    "Food Corner",
  ][i % 6],
  rule: [
    "Velocity spike",
    "Chargeback ratio",
    "Device / IP risk",
    "Category limit",
    "Mule account pattern",
  ][i % 5],
  score: 55 + ((i * 7) % 40),
  raised: d(10 - (i % 8)),
  iso: iso(10 - (i % 8)),
  status: ["Open", "On Hold", "Cleared"][i % 3],
}));
const sa_ledger = Array.from({ length: 14 }, (_, i) => {
  const a = (i + 3) * 41250;
  return {
    id: `LED-${700 + i}`,
    date: d(10 - Math.floor(i / 2)),
    iso: iso(10 - Math.floor(i / 2)),
    account: [
      "Merchant payable",
      "MDR revenue",
      "GST payable",
      "TDS payable",
      "Partner receivable",
      "Refund reserve",
      "Chargeback reserve",
    ][i % 7],
    debit: i % 2 ? a : 0,
    credit: i % 2 ? 0 : a,
    narration: [
      "Settlement T+1 batch",
      "MDR accrued",
      "GST on MDR",
      "TDS on commission",
      "Partner file matched",
      "Refunds processed",
      "Chargeback held",
    ][i % 7],
    status: "Balanced",
  };
});
const sa_config = [
  ["Default settlement cycle", "T+1", "Merchant"],
  ["MDR (UPI)", "0.00%", "Merchant"],
  ["MDR (Card)", "1.80%", "Merchant"],
  ["Max transaction limit", "₹ 2,00,000", "Merchant"],
  ["Permitted contact hours", "8:00 AM - 7:00 PM", "Collection"],
  ["Penal charge", "2% per month", "Collection"],
  ["Admin session timeout", "30 minutes", "Platform"],
  ["Admin MFA", "Mandatory", "Platform"],
  ["CERT-In incident SLA", "6 hours", "Platform"],
].map(([name, value, scope], i) => ({
  id: `CFG-${i + 1}`,
  name,
  value,
  scope,
  updatedBy: "Amit Sharma",
  status: "Active",
}));
const sa_legal = [
  ["Terms & Conditions (Merchant)", "Merchant"],
  ["Terms & Conditions (Borrower)", "Collection"],
  ["Privacy Notice (DPDP)", "All"],
  ["Refund & Cancellation Policy", "Merchant"],
  ["Key Fact Statement", "Collection"],
  ["Grievance Redressal Policy", "All"],
  ["KYC / AML Summary", "All"],
  ["Recovery Code of Conduct", "Collection"],
].map(([name, audience], i) => ({
  id: `LEG-${i + 1}`,
  name,
  audience,
  version: `v${1 + (i % 3)}.0`,
  publishedOn: d(1 + i),
  reConsent: i % 3 === 2 ? "Required" : "No",
  status: i === 7 ? "Draft" : "Published",
}));
const sa_partners = [
  ["Partner Bank A", "Acquirer / PSP", "Merchant payments"],
  ["Sponsor Bank B", "Sponsor PSP bank", "UPI (Phase 2)"],
  ["KYC Vendor X", "KYC / PAN / GST", "Onboarding"],
  ["Partner NBFC A", "Lender", "Collections"],
  ["SMS Gateway Y", "Messaging (DLT)", "Notifications"],
  ["Device OEM Z", "POS / Soundbox", "Devices"],
].map(([name, type, product], i) => ({
  id: `PRT-${i + 1}`,
  name,
  type,
  product,
  contract: "Signed",
  status: i === 1 ? "Pending" : "Active",
}));

export const SA_DB = {
  sa_users,
  sa_maker,
  sa_audit,
  sa_risk,
  sa_ledger,
  sa_config,
  sa_legal,
  sa_partners,
};
