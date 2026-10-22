// Mock data for Collection Admin (lending & EMI collection). Seeded and consistent across pages.
let seed = 5;
const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = (a) => a[Math.floor(r() * a.length)];
const int = (a, b) => Math.floor(a + r() * (b - a + 1));
const iso = (d) => `2026-10-${String(d).padStart(2, "0")}`;
const dstr = (d) => `Oct ${String(d).padStart(2, "0")}, 2026`;
const mobile = () => `+91 9${int(1000, 9999)} ${int(10000, 99999)}`;
const NAMES = [
  "Rajesh Patil",
  "Priya Deshmukh",
  "Sameer Khan",
  "Neha Jadhav",
  "Amit More",
  "Ramesh Pawar",
  "Sonal Todkar",
  "Arun Kate",
  "Meena Shaikh",
  "Vijay Pawar",
  "Kiran More",
  "Pooja Salunke",
  "Suresh Jagtap",
  "Anil Kulkarni",
  "Sneha Gupta",
  "Mahesh Yadav",
];
const FIRST = [
  "Anita",
  "Vikas",
  "Manoj",
  "Rekha",
  "Sagar",
  "Nisha",
  "Tushar",
  "Kavya",
  "Omkar",
  "Shweta",
  "Harsh",
  "Deepa",
  "Yogesh",
  "Swati",
];
const LAST = [
  "Bhosale",
  "Chavan",
  "Gaikwad",
  "Mane",
  "Shinde",
  "Kamble",
  "Thorat",
  "Wagh",
  "Jadhav",
  "Pingale",
  "Joshi",
  "Nair",
  "Sawant",
  "Bhoir",
];
const B = [...NAMES, ...FIRST.map((f, i) => `${f} ${LAST[i]}`)];
const AGENTS = [
  "Rajesh Patil",
  "Priya Deshmukh",
  "Sameer Khan",
  "Neha Jadhav",
  "Amit More",
  "Kavita Rao",
  "Imran Sheikh",
  "Deepak Joshi",
];
const PRODUCTS = [
  "Personal Loan",
  "Business Loan",
  "Gold Loan",
  "Vehicle Loan",
];
const LENDERS = ["SmartHub Finance", "Partner NBFC A", "Partner Bank B"];
const CITIES = ["Pune", "Mumbai", "Nashik", "Nagpur", "Kolhapur"];

const c_loans = B.map((b, i) => {
  const principal = int(50, 800) * 1000;
  const status =
    i % 4 === 3
      ? "Overdue"
      : i % 11 === 5
        ? "NPA"
        : i % 9 === 8
          ? "Closed"
          : "Active";
  const dpd =
    status === "Overdue" ? int(20, 92) : status === "NPA" ? int(95, 140) : 0;
  return {
    id: `LN-${String(101 + i).padStart(5, "0")}`,
    borrower: b,
    product: pick(PRODUCTS),
    lender: pick(LENDERS),
    principal,
    outstanding:
      status === "Closed" ? 0 : Math.round(principal * (0.4 + r() * 0.5)),
    emi: Math.round(principal / int(18, 36) / 100) * 100,
    dpd,
    status,
  };
});
const c_borrowers = B.map((n, i) => ({
  id: `BRW-${1001 + i}`,
  name: n,
  mobile: mobile(),
  city: CITIES[i % 5],
  loans: 1,
  riskBand:
    c_loans[i].dpd > 60 ? "High Risk" : c_loans[i].dpd > 0 ? "Medium" : "Low",
  status: c_loans[i].status === "Closed" ? "Closed" : "Active",
}));
const c_overdue = c_loans
  .filter((l) => l.dpd > 0)
  .map((l) => ({
    id: `OD-${l.id}`,
    borrower: l.borrower,
    loan: l.id,
    overdue: l.emi * Math.ceil(l.dpd / 30),
    dpd: l.dpd,
    risk: l.dpd > 60 ? "High Risk" : l.dpd > 30 ? "Medium" : "Low",
    status: "Open",
  }));
const bucket = (d) =>
  d <= 30 ? "1-30" : d <= 60 ? "31-60" : d <= 90 ? "61-90" : "90+";
const total = c_overdue.reduce((s, o) => s + o.overdue, 0);
const c_aging = ["1-30", "31-60", "61-90", "90+"].map((b, i) => {
  const rows = c_overdue.filter((o) => bucket(o.dpd) === b);
  const amt = rows.reduce((s, o) => s + o.overdue, 0);
  return {
    id: `AGE-${i + 1}`,
    bucket: `${b} days`,
    accounts: rows.length,
    amount: amt,
    share: `${Math.round((amt / total) * 100)}%`,
    status: i > 1 ? "Action Needed" : "Monitor",
  };
});
const c_emi = Array.from({ length: 36 }, (_, i) => {
  const l = c_loans[i % 30];
  const status =
    i < 8 ? "Due" : i < 14 ? "Paid" : i < 18 ? "Overdue" : "Upcoming";
  return {
    id: `EMI-${5001 + i}`,
    borrower: l.borrower,
    loan: l.id,
    emi: l.emi,
    dueDate:
      status === "Due"
        ? dstr(10)
        : status === "Paid"
          ? dstr(5)
          : status === "Overdue"
            ? dstr(2)
            : i % 2
              ? dstr(15)
              : "Nov 05, 2026",
    status,
  };
});
const c_payments = Array.from({ length: 30 }, (_, i) => {
  const l = c_loans[(i * 3) % 30];
  const day = 10 - Math.floor(i / 4);
  return {
    id: `PAY-${9001 + i}`,
    dateTime: `${dstr(day)} ${String(9 + (i % 8)).padStart(2, "0")}:${String((i * 17) % 60).padStart(2, "0")} AM`,
    iso: iso(day),
    borrower: l.borrower,
    loan: l.id,
    amount: l.emi,
    method: pick(["UPI", "Net Banking", "Card"]),
    status: i % 9 === 4 ? "Failed" : i % 13 === 6 ? "Pending" : "Success",
    receiptNo: `RC-${20261000 + i}`,
  };
});
const c_applications = Array.from({ length: 20 }, (_, i) => ({
  id: `LA-${3001 + i}`,
  applicant: B[(i + 7) % 30],
  product: pick(PRODUCTS),
  amount: int(50, 800) * 1000,
  appliedOn: dstr(10 - (i % 9)),
  iso: iso(10 - (i % 9)),
  status: ["Under Review", "Approved", "Pending Documents", "Rejected"][i % 4],
}));
const c_disb = Array.from({ length: 15 }, (_, i) => ({
  id: `DSB-${7001 + i}`,
  loan: c_loans[i].id,
  borrower: c_loans[i].borrower,
  amount: c_loans[i].principal,
  date: dstr(10 - (i % 9)),
  iso: iso(10 - (i % 9)),
  mode: pick(["IMPS", "NEFT"]),
  status: i % 8 === 5 ? "Pending" : i % 12 === 9 ? "Failed" : "Disbursed",
}));
const c_kyc = B.map((b, i) => ({
  id: `KYC-${i + 1}`,
  borrower: b,
  pan: i % 6 === 4 ? "Pending" : "Verified",
  address: i % 7 === 2 ? "Pending" : "Verified",
  consent: "Recorded",
  status:
    i % 13 === 9
      ? "Rejected"
      : i % 6 === 4 || i % 7 === 2
        ? "Pending"
        : "Verified",
}));
const c_cases = c_overdue.map((o, i) => ({
  id: `CS-${i + 1}`,
  borrower: o.borrower,
  loan: o.loan,
  bucket: bucket(o.dpd),
  due: o.overdue,
  agent: AGENTS[i % 8],
  lastContact: dstr(9 - (i % 5)),
  status: ["Open", "Promised", "Collected", "Escalated"][i % 4],
}));
const c_followups = Array.from({ length: 20 }, (_, i) => ({
  id: `FU-${i + 1}`,
  borrower: c_loans[(i * 2) % 30].borrower,
  loan: c_loans[(i * 2) % 30].id,
  agent: AGENTS[i % 8],
  type: pick(["Call", "Visit", "SMS"]),
  nextDate: dstr(10 + (i % 10)),
  outcome: pick([
    "Will pay on Friday",
    "Not reachable",
    "Asked for extension",
    "Paid partially",
  ]),
  status: ["Scheduled", "Completed", "Missed"][i % 3],
}));
const c_promises = Array.from({ length: 15 }, (_, i) => ({
  id: `PTP-${i + 1}`,
  borrower: c_loans[(i * 2 + 1) % 30].borrower,
  loan: c_loans[(i * 2 + 1) % 30].id,
  amount: c_loans[(i * 2 + 1) % 30].emi,
  promiseDate: dstr(8 + (i % 10)),
  agent: AGENTS[i % 8],
  status: ["Open", "Kept", "Broken"][i % 3],
}));
const c_agents = AGENTS.map((name, i) => {
  const target = int(100, 150) * 1000;
  const collected = Math.round(target * (0.65 + r() * 0.3));
  return {
    id: `AG-${101 + i}`,
    name,
    mobile: mobile(),
    branch: CITIES[i % 5],
    assigned: int(220, 320),
    collected,
    target,
    achievement: `${Math.round((collected / target) * 100)}%`,
    status: i === 6 ? "On Leave" : "Active",
  };
});
const c_assign = Array.from({ length: 16 }, (_, i) => ({
  id: `ASN-${i + 1}`,
  agent: AGENTS[i % 8],
  area: `${CITIES[i % 5]} - ${411000 + i}`,
  accounts: int(30, 80),
  bucket: ["1-30", "31-60", "61-90", "90+"][i % 4],
  assignedOn: dstr(1 + (i % 9)),
  status: i % 7 === 6 ? "Reassigned" : "Active",
}));
const c_recon = Array.from({ length: 8 }, (_, i) => {
  const t = int(900, 2400);
  const un = int(2, 30);
  return {
    id: `${LENDERS[i % 3].split(" ").join("_")}_2026100${(i % 9) + 1}.csv`,
    lender: LENDERS[i % 3],
    date: dstr(1 + i),
    total: t,
    matched: t - un,
    unmatched: un,
    status: un > 25 ? "Exception" : i % 4 === 3 ? "In Review" : "Completed",
  };
});
const c_tickets = Array.from({ length: 14 }, (_, i) => ({
  id: `DSP-${201 + i}`,
  subject: [
    "Wrong penal charge",
    "Payment not reflected",
    "EMI amount dispute",
    "Receipt not received",
    "Conduct complaint",
  ][i % 5],
  borrower: B[i],
  priority: ["P1", "P2", "P3", "P4"][i % 4],
  raised: dstr(10 - (i % 9)),
  iso: iso(10 - (i % 9)),
  status: ["Open", "In Progress", "Resolved"][i % 3],
}));
const c_notifications = Array.from({ length: 12 }, (_, i) => ({
  id: `CNT-${i + 1}`,
  title: [
    "EMI due today for 48 accounts",
    "Promise to pay broken: LN-00107",
    "Reconciliation exception in partner file",
    "New dispute raised",
    "Agent target achieved",
  ][i % 5],
  channel: ["EMI", "Collections", "Reconciliation", "Support", "Agents"][i % 5],
  time: dstr(10 - Math.floor(i / 3)),
  iso: iso(10 - Math.floor(i / 3)),
  status: i < 5 ? "Unread" : "Read",
}));
const c_settings = [
  ["Permitted contact hours", "8:00 AM - 7:00 PM"],
  ["Grace period (days)", "3"],
  ["Penal charge", "2% per month"],
  ["Promise-to-pay window", "7 days"],
  ["Auto receipt on payment", "Enabled"],
  ["Agent daily cash limit", "₹ 50,000"],
  ["Admin MFA", "Enabled"],
  ["Support email", "collections@smarthubpay.in"],
].map(([name, value], i) => ({
  id: `CCFG-${i + 1}`,
  name,
  value,
  updatedBy: "Amit Sharma",
  status: "Active",
}));
const c_reportFiles = [
  ["Daily Collection Report", "Collection", "PDF"],
  ["Agent-wise Collection Report", "Collection", "Excel"],
  ["Promise-to-Pay Report", "Collection", "Excel"],
  ["Loan Portfolio Report", "Loan", "PDF"],
  ["Delinquency (Aging) Report", "Loan", "Excel"],
  ["Disbursement Report", "Loan", "PDF"],
].map(([name, group, type], i) => ({
  id: `CRPT-${i + 1}`,
  name,
  group,
  type,
  range: "Oct 1 - Oct 10, 2026",
  generated: `Oct 10, 2026 0${i + 1}:30 PM`,
  iso: iso(10),
  status: "Completed",
}));

export const COLLECTION_DB = {
  c_loans,
  c_borrowers,
  c_overdue,
  c_aging,
  c_emi,
  c_payments,
  c_applications,
  c_disb,
  c_kyc,
  c_cases,
  c_followups,
  c_promises,
  c_agents,
  c_assign,
  c_recon,
  c_tickets,
  c_notifications,
  c_settings,
  c_reportFiles,
};
export const COLLECTION_TREND = Array.from({ length: 10 }, (_, i) => ({
  day: `Oct ${String(i + 1).padStart(2, "0")}`,
  Due: +(4 + (i % 4) * 0.6).toFixed(1),
  Collected: +(2 + i * 0.35).toFixed(1),
}));
