// Shared vocabulary for the two screens that used to be generic tables.
// Everything here is plain data or a pure string helper so the server actions and
// the client components describe an approval or a rule the same way.

import { labelize } from "@/lib/api/labels";
import { inr } from "@/lib/format";

// ---------------------------------------------------------------------------
// Approvals (maker-checker)
// ---------------------------------------------------------------------------

// The maker-checker table stores an action string, not a foreign key, so the
// meaning of each action lives with the panel. `domain` decides which route a
// decision is sent to: the generic queue route only records the decision and
// leaves the business object untouched, while these three routes record the
// decision *and* apply the settlement/refund/dispute effect.
export const APPROVAL_ACTIONS = {
  settlement_batch_release: {
    label: "Release a settlement batch",
    short: "Settlement release",
    domain: "settlement",
    referenceKey: "batch_ref",
    referenceLabel: "Batch reference",
    amountKey: "net_paise",
    effect:
      "Marks the batch approved so it can be released. The payout instruction is created by the release step on the settlement screen, and only an approved batch can reach it.",
  },
  refund_approve: {
    label: "Approve a merchant refund",
    short: "Refund approval",
    domain: "payments",
    referenceKey: "merchant_refund_id",
    referenceLabel: "Refund reference",
    amountKey: "amount_paise",
    effect:
      "Approves the refund and lets the payment provider process it. Rejecting stops the refund and tells the merchant side that it will not be paid.",
  },
  dispute_resolve: {
    label: "Resolve a chargeback / dispute",
    short: "Dispute decision",
    domain: "disputes",
    referenceKey: "dispute_ref",
    referenceLabel: "Dispute reference",
    amountKey: "amount_paise",
    effect:
      "Applies the outcome the maker proposed (accept, win or lose). Accepting or losing can post a chargeback loss against the merchant, so a second person has to sign it off.",
  },
};

const PAYLOAD_LABELS = {
  batch_ref: "Batch reference",
  merchant_refund_id: "Refund reference",
  dispute_ref: "Dispute reference",
  order_id: "Order",
  merchant_code: "Merchant code",
  outcome: "Proposed outcome",
  net_paise: "Net payout",
  amount_paise: "Amount",
  max_amount_paise: "Limit",
  trigger_amount_paise: "Triggering payment",
  window_seconds: "Window",
  max_payments: "Payment limit",
  max_count: "Count limit",
  payments: "Payments seen",
  devices: "Devices seen",
  max_devices: "Device limit",
  risk_score: "Risk score",
  event_type: "Event type",
  device_id: "Device",
};

export const approvalMeta = (action) => {
  const code = String(action || "");
  return (
    APPROVAL_ACTIONS[code] || {
      label: labelize(code) || "Unknown request",
      short: labelize(code) || "Unknown",
      domain: "generic",
      referenceKey: null,
      referenceLabel: "Payload",
      amountKey: null,
      effect:
        "This request type has no domain handler in this dashboard. Approving records the decision in the maker-checker queue; the change itself has to be applied on the screen that owns it.",
    }
  );
};

export const approvalReference = (action, payload) => {
  const meta = approvalMeta(action);
  if (!meta.referenceKey) return null;
  const value = payload && payload[meta.referenceKey];
  return value === undefined || value === null || value === "" ? null : String(value);
};

export const isPaiseKey = (key) => /_paise$/i.test(String(key || ""));

export const moneyFromPaise = (paise) =>
  Number.isFinite(Number(paise)) ? inr(Number(paise) / 100) : "—";

export const windowText = (seconds) => {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return "the configured window";
  if (value % 86_400 === 0) {
    const days = value / 86_400;
    return days === 1 ? "24 hours" : `${days} days`;
  }
  if (value % 3_600 === 0) {
    const hours = value / 3_600;
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  if (value % 60 === 0) {
    const minutes = value / 60;
    return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  }
  return `${value} seconds`;
};

// A maker-checker payload is a flat dict of ids, references and paise. Showing
// `net_paise: 250000` is exactly the kind of thing this screen is supposed to
// remove, so keys that denote money are formatted as rupees and the window is
// spelled out.
export const payloadRows = (payload) => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  return Object.entries(payload)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => {
      let shown;
      if (value === null) shown = "—";
      else if (isPaiseKey(key)) shown = moneyFromPaise(value);
      else if (key === "window_seconds") shown = windowText(value);
      else if (typeof value === "boolean") shown = value ? "Yes" : "No";
      else if (typeof value === "object") shown = JSON.stringify(value);
      else shown = String(value);
      return {
        key,
        label: PAYLOAD_LABELS[key] || labelize(key),
        value: shown,
      };
    });
};

export const approvalStatusLabel = (status) => labelize(status) || "Unknown";

// ---------------------------------------------------------------------------
// Risk rules and alerts
// ---------------------------------------------------------------------------

// The engine in app/features/risk/service.py only knows these three shapes.
// Offering a fourth category here would create a rule that never fires, so the
// form names the three that do and shows the threshold in words.
export const RULE_CATEGORIES = [
  {
    value: "velocity",
    label: "Payment velocity",
    thresholdLabel: "How many payments in the window",
    field: "maxPayments",
    defaultField: 50,
    sentence: (v) =>
      `More than ${v.maxPayments || "?"} payments in ${windowText(v.windowSeconds)}.`,
  },
  {
    value: "amount",
    label: "Payment amount",
    thresholdLabel: "Total payments allowed in the window (₹)",
    field: "maxAmount",
    defaultField: 50_000,
    sentence: (v) =>
      `More than ${inr(v.maxAmount || 0)} of payments in ${windowText(v.windowSeconds)}.`,
  },
  {
    value: "device",
    label: "Device spread",
    thresholdLabel: "How many distinct devices in the window",
    field: "maxDevices",
    defaultField: 3,
    sentence: (v) =>
      `More than ${v.maxDevices || "?"} distinct devices in ${windowText(v.windowSeconds)}.`,
  },
];

export const ruleCategory = (value) =>
  RULE_CATEGORIES.find((category) => category.value === value) || null;

const thresholdInt = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null;
};

// A rule sentence written from the raw API row, for the rules table.
export const ruleSentence = (rule) => {
  const threshold = rule && typeof rule.threshold === "object" ? rule.threshold : {};
  const window = thresholdInt(threshold.window_seconds) || 3_600;
  if (!rule) return "—";
  if (rule.category === "velocity") {
    const limit = thresholdInt(threshold.max_payments ?? threshold.max_count);
    return limit
      ? `More than ${limit} payments in ${windowText(window)}.`
      : "No payment limit set, so the engine will not fire this rule.";
  }
  if (rule.category === "amount") {
    const limit = thresholdInt(threshold.max_amount_paise);
    return limit
      ? `More than ${moneyFromPaise(limit)} of payments in ${windowText(window)}.`
      : "No amount limit set, so the engine will not fire this rule.";
  }
  if (rule.category === "device") {
    const limit = thresholdInt(threshold.max_devices);
    return limit
      ? `More than ${limit} distinct devices in ${windowText(window)}.`
      : "No device limit set, so the engine will not fire this rule.";
  }
  return "Custom rule. The engine does not evaluate this category automatically; alerts still appear when another flow raises them.";
};

// The form keeps the threshold as human fields and only converts to the JSON
// the API stores on submit. A rupee box that silently saves paise is a classic
// way to send a ₹50,000 rule as ₹500.
export const ruleFormFromApi = (rule) => {
  const threshold = rule && typeof rule.threshold === "object" ? rule.threshold : {};
  const category = rule && rule.category;
  return {
    code: rule ? rule.rule_code : "",
    name: rule ? rule.name : "",
    category: category || "velocity",
    severity: rule ? rule.severity : "medium",
    description: rule ? rule.description || "" : "",
    maxPayments: String(threshold.max_payments ?? threshold.max_count ?? 50),
    maxAmount: String(
      threshold.max_amount_paise != null ? Number(threshold.max_amount_paise) / 100 : 50_000,
    ),
    maxDevices: String(threshold.max_devices ?? 3),
    windowSeconds: String(thresholdInt(threshold.window_seconds) || 3_600),
    thresholdRaw:
      rule && !ruleCategory(category) && threshold ? JSON.stringify(threshold, null, 2) : "",
  };
};

export const rulePreview = (values) => {
  const category = ruleCategory(values.category);
  if (!category) return ruleSentence({ category: values.category, threshold: null });
  return category.sentence(values);
};

export const RISK_SEVERITIES = ["low", "medium", "high", "critical"];
export const RISK_STATUSES = ["open", "acknowledged", "resolved", "dismissed"];

export const riskStatusLabel = (status) => labelize(status) || "Unknown";
export const isClosedRiskStatus = (status) =>
  status === "resolved" || status === "dismissed";

// The alert meta is written by the engine and follows the same paise/window
// conventions as an approval payload, so it reuses the same row builder.
export const alertMetaRows = (meta) => payloadRows(meta);
