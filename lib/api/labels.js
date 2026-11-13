// The dashboard's tables were built against mock rows whose status values were display strings
// ("Under Review"), while the backend uses snake_case enums ("under_review"). Tabs and base
// filters are generated from the values we return, so one symmetric pair of transforms keeps
// filtering consistent without a hand-maintained map per enum.

const ACRONYMS = {
  kyc: "KYC",
  faq: "FAQ",
  pos: "POS",
  upi: "UPI",
  emi: "EMI",
  utr: "UTR",
  gst: "GST",
  pan: "PAN",
  mcc: "MCC",
  qr: "QR",
  sla: "SLA",
  npa: "NPA",
  tat: "TAT",
  edc: "EDC",
};

export const labelize = (value) => {
  if (value === null || value === undefined) return "";
  return String(value)
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      if (ACRONYMS[lower]) return ACRONYMS[lower];
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
};

export const delabelize = (label) =>
  String(label)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

export const camel = (key) => key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

export const camelRow = (row) =>
  Object.fromEntries(Object.entries(row || {}).map(([k, v]) => [camel(k), v]));

// Backend money fields are integers in paise; the UI's inr() formatter expects rupees.
export const rupees = (paise) =>
  paise === null || paise === undefined ? null : Number(paise) / 100;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// The mock rows carried both a display string and an ISO date for range filtering.
export function dateParts(iso) {
  if (!iso) return { dateTime: "", date: "", iso: "" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { dateTime: String(iso), date: String(iso), iso: String(iso).slice(0, 10) };
  const day = String(d.getDate()).padStart(2, "0");
  const stamp = `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  const h24 = d.getHours();
  const hh = String(h24 % 12 || 12).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return {
    dateTime: `${stamp} ${hh}:${mm} ${h24 >= 12 ? "PM" : "AM"}`,
    date: stamp,
    iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${day}`,
  };
}

// Backend timestamps are naive UTC (TIMESTAMP WITHOUT TIME ZONE). Without the explicit Z suffix
// JavaScript would read them as browser-local and a schedule window would look hours out.
export function utcDate(value) {
  if (!value) return null;
  const text = String(value).trim();
  const stamped = /(?:Z|[+-]\d{2}:?\d{2})$/.test(text) ? text : `${text}Z`;
  const d = new Date(stamped);
  return Number.isNaN(d.getTime()) ? null : d;
}

// The inverse of the seam's utcWallClock(): a naive-UTC column turned back into what a
// datetime-local box expects, which is the operator's own wall clock. Without it an item
// scheduled at 10:00 UTC shows as 15:30 in IST and the first save moves it five hours.
export function localWallClock(value) {
  const d = utcDate(value);
  if (!d) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
