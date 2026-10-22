// Page configs for Super Admin. Key = route path under /super-admin/.
const cols = (...s) =>
  s.map((x) => {
    const [key, label, type] = x.split(":");
    return { key, label, ...(type ? { type } : {}) };
  });
const set = (label, setStatus, when, danger) => ({
  label,
  confirm:
    "Simulated action: only updates local demo data. In production a checker (a different user) must approve sensitive actions.",
  setStatus,
  when,
  danger,
});

export const PAGES = {
  merchants: {
    title: "Merchants",
    subtitle:
      "All merchants across the platform (read-only overview; KYB is handled by Merchant Admin).",
    resource: "merchants",
    tabField: "status",
    filters: ["category", "city"],
    columns: cols(
      "id:Merchant ID",
      "name:Trade Name",
      "mcc:Category (MCC)",
      "city:City",
      "kycStatus:KYC Status",
      "bankStatus:Bank Status",
      "status:Merchant Status",
    ),
    stats: [
      ["Total Merchants", "12,485"],
      ["Active", "11,230"],
      ["Pending KYC", "312"],
      ["Suspended", "240"],
    ],
  },
  partners: {
    title: "Partners",
    subtitle: "Acquirers, sponsor banks, lenders and vendors.",
    resource: "sa_partners",
    tabField: "status",
    columns: cols(
      "id:ID",
      "name:Partner",
      "type:Type",
      "product:Used For",
      "contract:Contract",
      "status:Status",
    ),
    stats: [
      ["Partners", "6"],
      ["Active", "5"],
      ["Pending", "1"],
      ["Contracts signed", "6"],
    ],
  },
  "maker-checker": {
    title: "Maker-Checker Queue",
    subtitle:
      "Sensitive actions raised by makers, awaiting a different checker.",
    resource: "sa_maker",
    tabField: "status",
    filters: ["action", "dashboard"],
    columns: cols(
      "id:ID",
      "action:Action",
      "target:Target",
      "dashboard:Dashboard",
      "maker:Maker",
      "requestedOn:Requested On",
      "status:Status",
    ),
    stats: [
      ["Requests", "12"],
      ["Pending", "8"],
      ["Approved", "3"],
      ["Rejected", "1"],
    ],
    actions: [
      set("Approve (checker)", "Approved", (r) => r.status === "Pending"),
      set("Reject", "Rejected", (r) => r.status === "Pending", true),
    ],
  },
  risk: {
    title: "Risk Queue",
    subtitle: "Alerts from velocity, chargeback, device and category rules.",
    resource: "sa_risk",
    tabField: "status",
    filters: ["rule"],
    columns: cols(
      "id:Alert",
      "merchant:Merchant",
      "rule:Rule",
      "score:Risk Score",
      "raised:Raised",
      "status:Status",
    ),
    stats: [
      ["Alerts", "12"],
      ["Open", "4"],
      ["On Hold", "4"],
      ["Cleared", "4"],
    ],
    actions: [
      set(
        "Hold settlement (maker)",
        "On Hold",
        (r) => r.status === "Open",
        true,
      ),
      set("Clear alert", "Cleared", (r) => r.status !== "Cleared"),
    ],
  },
  ledger: {
    title: "Finance Ledger",
    subtitle: "Double-entry ledger. Debits must equal credits every day.",
    resource: "sa_ledger",
    filters: ["account"],
    columns: cols(
      "id:Entry",
      "date:Date",
      "account:Account",
      "debit:Debit:money",
      "credit:Credit:money",
      "narration:Narration",
      "status:Status",
    ),
    stats: [
      ["Entries", "14"],
      ["Balanced days", "5"],
      ["GST payable", "Tracked"],
      ["TDS payable", "Tracked"],
    ],
  },
  "audit-logs": {
    title: "Audit Logs",
    subtitle:
      "Every sensitive action: user, time, IP, entity and old → new value.",
    resource: "sa_audit",
    filters: ["user", "action"],
    columns: cols(
      "time:Time",
      "user:User",
      "action:Action",
      "entity:Entity",
      "change:Change",
      "ip:IP",
    ),
    stats: [
      ["Events today", "24"],
      ["Logins", "4"],
      ["Config changes", "3"],
      ["Role changes", "3"],
    ],
  },
  config: {
    title: "System Configuration",
    subtitle: "Fees, cycles, limits and policy values (demo).",
    resource: "sa_config",
    filters: ["scope"],
    columns: cols(
      "name:Setting",
      "value:Value",
      "scope:Scope",
      "updatedBy:Updated By",
      "status:Status",
    ),
    stats: [
      ["Settings", "9"],
      ["MFA", "Mandatory"],
      ["Cycle", "T+1"],
      ["Contact hours", "8 AM - 7 PM"],
    ],
  },
  legal: {
    title: "Legal Content",
    subtitle:
      "Versioned legal pages. Publishing a new version can force re-consent.",
    resource: "sa_legal",
    tabField: "status",
    filters: ["audience"],
    columns: cols(
      "id:ID",
      "name:Document",
      "audience:Audience",
      "version:Version",
      "publishedOn:Published",
      "reConsent:Re-consent",
      "status:Status",
    ),
    stats: [
      ["Documents", "8"],
      ["Published", "7"],
      ["Draft", "1"],
      ["Re-consent needed", "3"],
    ],
    actions: [
      set("Publish (simulated)", "Published", (r) => r.status === "Draft"),
    ],
  },
};
