// Centralised mock data (seeded, deterministic). Replace via services when real APIs exist.
let seed = 11;
const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = (a) => a[Math.floor(r() * a.length)];
const int = (a, b) => Math.floor(a + r() * (b - a + 1));
const iso = (d) => `2026-10-${String(d).padStart(2, "0")}`;
const mobile = () => `+91 9${int(1000, 9999)} ${int(10000, 99999)}`;

export const MERCHANTS = [
  ["Fresh Mart", "Retail Store"],
  ["Urban Foods", "Restaurant"],
  ["Maya Stores", "Supermarket"],
  ["Daily Needs", "Retail Store"],
  ["Super Bazaar", "Supermarket"],
  ["Chai Point", "Restaurant"],
  ["Green Mart", "Retail Store"],
  ["Food Corner", "Restaurant"],
  ["City Pharmacy", "Pharmacy"],
  ["Shree Sai Petrol Pump", "Petrol Pump"],
  ["Urban Bites", "Restaurant"],
  ["A1 Electronics", "Electronics"],
];
const CITIES = ["Pune", "Mumbai", "Nashik", "Nagpur", "Kolhapur", "Aurangabad"];
const STAFF = [
  "Rajesh Patil",
  "Priya Deshmukh",
  "Sameer Khan",
  "Neha Jadhav",
  "Amit More",
  "Kiran Shetty",
  "Pooja Kulkarni",
  "Vikram Singh",
];
const BANKS = ["HDFC Bank", "ICICI Bank", "Axis Bank", "Yes Bank"];

const merchants = MERCHANTS.concat(MERCHANTS).map(([name, category], i) => ({
  id: `MRC-${String(1248 - i).padStart(6, "0")}`,
  name: i < 12 ? name : `${name} ${i < 18 ? "Annex" : "Hub"}`,
  category,
  city: pick(CITIES),
  mobile: mobile(),
  salesStaff: pick(STAFF),
  volume: int(300000, 2900000),
  transactions: int(900, 12400),
  status: i % 9 === 8 ? "Inactive" : "Active",
  iso: iso(10 - (i % 10)),
}));

const MCC = {
  "Retail Store": 5411,
  Restaurant: 5812,
  Supermarket: 5411,
  Pharmacy: 5912,
  "Petrol Pump": 5541,
  Electronics: 5732,
};
const STATES = [
  "Active",
  "Active",
  "Active",
  "Pending KYC",
  "Active",
  "Bank Verification",
  "Active",
  "Suspended",
  "Inactive",
];
merchants.forEach((m, i) => {
  const st = STATES[i % 9];
  const live = ["Active", "Suspended", "Inactive"].includes(st);
  const kyc = live
    ? "Approved"
    : st === "Pending KYC"
      ? "KYC Pending"
      : "Under Review";
  const on = `Oct ${String(10 - (i % 9)).padStart(2, "0")}, 2026`;
  const by = "Amit Sharma";
  const history = [
    {
      date: on,
      event: "Application submitted by sales staff",
      by: m.salesStaff,
    },
  ];
  if (kyc !== "KYC Pending")
    history.push({ date: on, event: "Documents reviewed", by });
  if (live)
    history.push(
      { date: on, event: "Bank account verified (penny drop)", by },
      { date: on, event: "Merchant approved", by },
    );
  Object.assign(m, {
    status: st,
    kycStatus: kyc,
    bankStatus: live ? "Verified" : "Pending",
    legalName: `${m.name} ${["Pvt Ltd", "LLP", "Traders"][i % 3]}`,
    mcc: `${m.category} (${MCC[m.category]})`,
    entityType: ["Private Limited", "LLP", "Proprietorship"][i % 3],
    owner: STAFF[(i + 2) % 8],
    email: `${m.name.split(" ")[0].toLowerCase()}@example.com`,
    gstin: `27ABCDE${1234 + i}F1Z5`,
    pan: `ABCDE${1234 + i}F`,
    turnover: ["₹ 10-20 Lakh", "₹ 20-50 Lakh", "₹ 50 Lakh - 1 Cr", "₹ 1-5 Cr"][
      i % 4
    ],
    address: `Shop No. ${i + 1}, MG Road, ${m.city}`,
    submittedOn: on,
    bankName: BANKS[i % 4],
    accountHolder: `${m.name} Pvt Ltd`,
    accountNo: `**** **** ${7800 + i}`,
    ifsc: `HDFC000${1234 + i}`,
    pennyRef: live ? `PD-2026${100 + i}` : "-",
    consent: {
      at: `${on} 10:24 AM`,
      ip: "192.168.1.20",
      device: "Android SM-A52",
      version: "v1.0",
    },
    declarations: live ? "Accepted" : "Pending",
    esign: live ? "Completed" : "Pending",
    beneficialOwners: [
      { name: STAFF[(i + 2) % 8], pan: `ABCDE${1234 + i}F`, share: "60%" },
      { name: STAFF[(i + 4) % 8], pan: `FGHIJ${2234 + i}K`, share: "40%" },
    ],
    documents: [
      "PAN Card",
      "Aadhaar (masked copy)",
      "Business Registration",
      "GST Certificate",
      "Cancelled Cheque",
      "Shop Photos",
    ].map((name) => ({ name, status: live ? "Valid" : "Uploaded" })),
    history,
  });
});

const KYC = [
  "Approved",
  "Document Review",
  "KYC Pending",
  "Bank Verification",
  "Under Review",
  "Rejected",
];
const onboarding = merchants.slice(0, 24).map((m, i) => ({
  id: `APP-2026${String(1000 + i).slice(1)}-${String(i + 1).padStart(3, "0")}`,
  merchant: m.name,
  category: m.category,
  mobile: m.mobile,
  salesStaff: m.salesStaff,
  appliedOn: `Oct ${String(10 - (i % 10)).padStart(2, "0")}, 2026`,
  iso: iso(10 - (i % 10)),
  status: KYC[(i * 5 + 1) % 6],
}));

const DOCS = [
  ["PAN Card", "PAN1234A.pdf"],
  ["Aadhaar Card", "aadhaar.pdf"],
  ["Business Registration", "gst_certificate.pdf"],
  ["Shop Photo", "shop_photo.jpg"],
  ["Address Proof", "address_proof.pdf"],
  ["Owner Selfie", "selfie.jpg"],
];
onboarding.forEach((a, i) => {
  const ok = a.status === "Approved";
  Object.assign(a, {
    legalName: `${a.merchant} Pvt Ltd`,
    owner: STAFF[(i + 3) % 8],
    gstin: `27ABCDE${1234 + i}F1Z5`,
    address: `Shop No. ${i + 1}, MG Road, ${CITIES[i % 6]}`,
    bankName: BANKS[i % 4],
    accountNo: `**** **** ${7800 + i}`,
    ifsc: `HDFC000${1234 + i}`,
    bankStatus: ok
      ? "Verified"
      : a.status === "Bank Verification"
        ? "In Progress"
        : "Pending",
    documents: DOCS.map(([name, file]) => ({
      name,
      file,
      status: ok ? "Valid" : "Uploaded",
      remarks: "",
    })),
    rejectionReason:
      a.status === "Rejected" ? "Invalid PAN: name does not match" : "",
  });
});
export const ONBOARD_TREND = Array.from({ length: 14 }, (_, i) => ({
  day: new Date(2026, 8, 27 + i).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  }),
  Approved: 20 + i,
  "Under Review": 10 + (i % 5) * 2,
  Rejected: 3 + (i % 3),
}));

const transactions = Array.from({ length: 80 }, (_, i) => {
  const m = pick(MERCHANTS);
  const x = r();
  const method = pick(["UPI", "UPI", "Card", "QR"]);
  const status = x < 0.9 ? "Success" : x < 0.96 ? "Failed" : "Refunded";
  const day = 10 - Math.floor(i / 8);
  return {
    id: `TXN${78492 - i}`,
    dateTime: `Oct ${String(day).padStart(2, "0")}, 2026 ${String(10 - Math.floor(i / 10)).padStart(2, "0")}:${String(59 - ((i * 7) % 60)).padStart(2, "0")} AM`,
    iso: iso(day),
    merchant: m[0],
    merchantId: `MRC-${String(1248 - MERCHANTS.indexOf(m)).padStart(6, "0")}`,
    method,
    amount: int(120, 5600),
    status,
    channel: pick(["QR", "POS", "Soundbox"]),
    utr: status === "Failed" ? "-" : String(int(400000000000, 929999999999)),
  };
});

const sales = STAFF.concat(["Sagar Pawar", "Meena Joshi"]).map((n, i) => ({
  id: `SP${String(i + 1).padStart(3, "0")}`,
  name: n,
  mobile: mobile(),
  city: CITIES[i % 6],
  merchantsAdded: 48 - i * 3,
  gmv: 1245690 - i * 98000,
  target: 124 - i * 7,
  status: i === 6 ? "On Leave" : i === 8 ? "Inactive" : "Active",
}));

sales.forEach((s, i) =>
  Object.assign(s, {
    email: `${s.name.split(" ")[0].toLowerCase()}@smarthubpay.in`,
    territory: s.city,
    pan: `ABCDE${1230 + i}F`,
    idProof: "Aadhaar (masked copy)",
    address: `${i + 10}, Main Road, ${s.city}`,
    bankAccount: `**** ${4000 + i}`,
    ifsc: "HDFC0001234",
    deviceId: `DEV-${700 + i}`,
    verification: i === 8 ? "Pending" : "Verified",
    policeVerification: "Done",
    conduct: true,
  }),
);
const settlements = Array.from({ length: 30 }, (_, i) => {
  const day = 30 - Math.floor(i / 2);
  const status =
    i === 0
      ? "Pending"
      : i === 3
        ? "Failed"
        : i === 5
          ? "Returned"
          : "Completed";
  return {
    id: `ST-202610${String(day).padStart(2, "0")}-0${(i % 2) + 1}`,
    date: `Oct ${day}, 2026`,
    iso: iso(Math.min(day, 10)),
    partner: BANKS[i % 4],
    merchantCount: int(52, 142),
    amount: int(976420, 2845200),
    status,
  };
});
const payouts = Array.from({ length: 20 }, (_, i) => ({
  id: `PO-20261029-${String(i + 1).padStart(3, "0")}`,
  merchant: MERCHANTS[i % 12][0],
  account: `******* ${int(1000, 9999)}`,
  amount: int(36450, 125430),
  date: `Oct ${29 - Math.floor(i / 4)}, 2026`,
  iso: iso(10),
  status: i % 9 === 2 ? "Pending" : i % 11 === 5 ? "Failed" : "Success",
}));
const recon = BANKS.concat(BANKS).map((b, i) => ({
  id: `${b.split(" ")[0].toUpperCase()}_2026102${9 - (i % 5)}.csv`,
  partner: b,
  date: `Oct ${29 - (i % 5)}, 2026`,
  iso: iso(10),
  total: int(1650, 3842),
  matched: int(1600, 3800),
  unmatched: int(10, 52),
  status:
    i === 0
      ? "Completed"
      : i === 4
        ? "Exception"
        : i === 5
          ? "In Review"
          : "Completed",
}));
const reportFiles = [
  ["Settlement Summary Report", "PDF"],
  ["Merchant Payout Report", "Excel"],
  ["Bank-wise Settlement Report", "PDF"],
  ["Reconciliation Report", "Excel"],
  ["Failed Transactions Report", "PDF"],
].map(([name, type], i) => ({
  id: `RPT-${100 + i}`,
  name,
  type,
  range: "Oct 1 - Oct 31, 2026",
  generated: `Oct 31, 2026 10:${15 - i * 2} AM`,
  iso: iso(10),
  status: "Completed",
}));
const devices = Array.from({ length: 24 }, (_, i) => ({
  id: `SB-${String(123 - i).padStart(5, "0")}`,
  type: i % 3 === 0 ? "POS" : "Soundbox",
  merchant: MERCHANTS[i % 12][0],
  city: CITIES[i % 6],
  version: i % 4 === 0 ? "v2.3.9" : "v2.4.1",
  battery: `${int(35, 100)}%`,
  status: i % 8 === 7 ? "Inactive" : i % 5 === 4 ? "Offline" : "Online",
}));
const qrs = Array.from({ length: 24 }, (_, i) => ({
  id: `QR-${String(987 - i).padStart(6, "0")}`,
  type: i % 4 === 0 ? "Dynamic QR" : "Static QR",
  merchant: MERCHANTS[i % 12][0],
  scans: int(120, 9400),
  createdOn: `Sep ${String(1 + i).padStart(2, "0")}, 2026`,
  status: i % 7 === 6 ? "Inactive" : "Active",
}));
const inventory = Array.from({ length: 18 }, (_, i) => ({
  id: `INV-${String(5001 + i)}`,
  model: pick(["Sunmi V2 Pro", "PAX A920", "SmartHub Soundbox S1"]),
  serial: `SN${int(100000, 999999)}`,
  location: i % 3 ? "Deployed" : "Warehouse Pune",
  assignedTo: i % 3 ? MERCHANTS[i % 12][0] : "-",
  status: i % 3 ? "Active" : "In Stock",
}));
const categories = [
  ["Retail Stores", 32.4],
  ["Petrol Pumps", 18.6],
  ["Restaurants", 12.8],
  ["Pharmacies", 9.7],
  ["Supermarkets", 8.1],
  ["Others", 18.4],
].map(([name, share], i) => ({
  id: `CAT-${i + 1}`,
  name,
  share: `${share}%`,
  merchants: Math.round((12485 * share) / 100),
  mdr: ["0.40%", "0.30%", "0.50%", "0.45%", "0.40%", "0.60%"][i],
  status: "Active",
}));
const groups = [
  "Pune Retail Chain",
  "Mumbai Food Court Network",
  "Highway Fuel Partners",
  "Nashik Pharmacy Group",
  "Premium Supermarkets",
].map((name, i) => ({
  id: `GRP-${i + 1}`,
  name,
  members: int(8, 90),
  settlementCycle: i % 2 ? "T+1" : "T+2",
  owner: STAFF[i],
  status: "Active",
}));
const tickets = Array.from({ length: 22 }, (_, i) => ({
  id: `TKT-${4100 - i}`,
  subject: [
    "Settlement not received",
    "Chargeback dispute",
    "QR not scanning",
    "Refund request delayed",
    "Soundbox offline",
    "Wrong MDR charged",
  ][i % 6],
  merchant: MERCHANTS[i % 12][0],
  priority: ["P1", "P2", "P3", "P4"][i % 4],
  raised: `Oct ${10 - (i % 9)}, 2026`,
  iso: iso(10 - (i % 9)),
  status: ["Open", "In Progress", "Resolved"][i % 3],
}));
const notifications = Array.from({ length: 15 }, (_, i) => ({
  id: `NTF-${i + 1}`,
  title: [
    "KYC approved for Shree Sai Petrol Pump",
    "Settlement ST-20261029-02 completed",
    "Reconciliation exception detected",
    "Device SB-00119 went offline",
    "New dispute raised on TXN78489",
  ][i % 5],
  channel: ["System", "Settlement", "Risk", "Device", "Support"][i % 5],
  time: `Oct ${10 - Math.floor(i / 3)}, 2026`,
  iso: iso(10 - Math.floor(i / 3)),
  status: i < 3 ? "Unread" : "Read",
}));
const settings = [
  ["Default settlement cycle", "T+1"],
  ["MDR (UPI)", "0.00%"],
  ["MDR (Card)", "1.80%"],
  ["Max transaction limit", "₹ 2,00,000"],
  ["Session timeout", "30 minutes"],
  ["Admin MFA", "Enabled"],
  ["Support email", "support@smarthubpay.in"],
  ["Auto-hold risk score", "> 80"],
].map(([name, value], i) => ({
  id: `CFG-${i + 1}`,
  name,
  value,
  updatedBy: "Amit Sharma",
  status: "Active",
}));

export const DB = {
  merchants,
  onboarding,
  transactions,
  sales,
  settlements,
  payouts,
  recon,
  reportFiles,
  devices,
  qrs,
  inventory,
  categories,
  groups,
  tickets,
  notifications,
  settings,
};

export const DASHBOARD = {
  stats: [
    {
      label: "Total Merchants",
      value: "12,485",
      delta: "6.1%",
      up: true,
      color: "blue",
    },
    {
      label: "Active Merchants",
      value: "11,230",
      delta: "5.8%",
      up: true,
      color: "green",
    },
    {
      label: "Pending Onboarding",
      value: "245",
      delta: "12.4%",
      up: false,
      color: "amber",
    },
    {
      label: "Total Transaction Volume",
      value: "₹ 2,48,32,690",
      delta: "12.4%",
      up: true,
      color: "purple",
    },
  ],
  volume: Array.from({ length: 14 }, (_, i) => ({
    day: new Date(2026, 8, 27 + i).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    UPI: 8 + i * 1.1 + (i % 3),
    Card: 4 + i * 0.5,
    QR: 2 + i * 0.3,
    Others: 1 + i * 0.1,
  })),
  onboarding: [
    { name: "KYC Pending", value: 120, color: "#FF9F1C" },
    { name: "Document Review", value: 65, color: "#2F6FED" },
    { name: "Bank Verification", value: 40, color: "#1E9E6A" },
    { name: "Awaiting Activation", value: 20, color: "#CBD5E1" },
  ],
  categories: [
    ["Retail Stores", 32.4],
    ["Petrol Pumps", 18.6],
    ["Restaurants", 12.8],
    ["Pharmacies", 9.7],
    ["Supermarkets", 8.1],
    ["Others", 18.4],
  ],
  devices: [
    { name: "Online", value: 4237, color: "#1E9E6A" },
    { name: "Offline", value: 623, color: "#D64545" },
    { name: "Inactive", value: 380, color: "#CBD5E1" },
  ],
  topMerchants: [
    ["Fresh Mart", 12340, 2876450, 14.2],
    ["Urban Foods", 8920, 2219330, 11.6],
    ["Maya Stores", 6450, 1245210, 9.8],
    ["Daily Needs", 5980, 1086320, 7.4],
    ["Super Bazaar", 5210, 972110, 6.9],
  ],
};
