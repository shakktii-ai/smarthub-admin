import { api, currentUserId } from "@/lib/api/browser";
import { labelize, delabelize, rupees, dateParts } from "@/lib/api/labels";
import { EXTERNAL_DEEP_LINK } from "@/lib/deepLinks";
import { RESOURCES, UNMAPPED } from "./resources";

// List endpoints are pulled in bounded pages and then filtered/tabbled/paginated in memory,
// exactly as the mock layer did. This keeps tab counts correct: a server-side status filter would
// make every other tab read zero. FastAPI caps `limit` per route - 200 on most lists, 500 on the
// ledger/notifications/settlement/audit-log routes - so pages stay at the strictest ceiling and we
// keep pulling until the endpoint's own `total` is covered, up to MAX_ROWS.
const PAGE_SIZE = 200;
const MAX_ROWS = 1000;
// Short-lived client cache so navigating between list pages doesn't refetch the
// same data within a few seconds. Mutations bust the resource's entries.
const FETCH_CACHE = new Map();
const FETCH_CACHE_TTL = 15000;
function bustFetchCache(resource) {
  for (const key of FETCH_CACHE.keys()) {
    if (key.startsWith(`${resource}::`)) FETCH_CACHE.delete(key);
  }
}

// Flagged so ResourcePage can render "no endpoint yet" instead of a generic failure with a Retry
// button that would fail again.
const unmappedError = (resource) =>
  Object.assign(
    new Error(
      `${resource} is not connected to the backend yet${
        UNMAPPED[resource] ? `: ${UNMAPPED[resource]}` : ""
      }.`,
    ),
    { unmapped: true },
  );

async function fetchAll(resource, { q } = {}) {
  const key = `${resource}::${q || ""}`;
  const cached = FETCH_CACHE.get(key);
  if (cached && Date.now() - cached.at < FETCH_CACHE_TTL) {
    return cached.rows;
  }
  const cfg = RESOURCES[resource];
  const limit = Math.min(cfg.fetchLimit || PAGE_SIZE, PAGE_SIZE);
  const params = { limit, offset: 0 };
  if (cfg.fixedQuery) Object.assign(params, cfg.fixedQuery);
  if (q && cfg.supports && cfg.supports.q) params.q = q;

  const first = await api.get(cfg.path, params);
  const firstItems = cfg.shape === "array" ? first || [] : first?.items ?? [];
  const rows = firstItems.map(cfg.row);
  const total = Number(first?.total);
  const knownTotal = Number.isFinite(total) ? total : Infinity;

  if (firstItems.length < limit || rows.length >= knownTotal) {
    const result = cfg.only ? rows.filter(cfg.only) : rows;
    FETCH_CACHE.set(key, { at: Date.now(), rows: result });
    return result;
  }

  // Fetch the remaining pages in parallel instead of sequentially.
  const remainingOffsets = [];
  for (let offset = limit; offset < Math.min(knownTotal, MAX_ROWS); offset += limit) {
    remainingOffsets.push(offset);
  }
  const pages = await Promise.all(
    remainingOffsets.map(async (offset) => {
      const p = { ...params, offset };
      const res = await api.get(cfg.path, p);
      const items = cfg.shape === "array" ? res || [] : res?.items ?? [];
      return items.map(cfg.row);
    }),
  );
  for (const pageRows of pages) rows.push(...pageRows);

  const result = cfg.only ? rows.filter(cfg.only) : rows;
  FETCH_CACHE.set(key, { at: Date.now(), rows: result });
  return result;
}

// One bounded page, for the pickers that ask "which record do you mean?" while the operator types.
// listRecords() deliberately pulls the whole list so tabs and stat cards stay honest; a search box
// needs the opposite, because fetching a thousand merchants per keystroke is not a suggestion list.
export async function searchRecords(resource, term, limit = 20) {
  const cfg = RESOURCES[resource];
  if (!cfg) throw unmappedError(resource);
  const size = Math.min(limit, PAGE_SIZE);
  const params = { limit: size, offset: 0 };
  if (cfg.fixedQuery) Object.assign(params, cfg.fixedQuery);
  const q = String(term || "").trim();
  const serverSearch = Boolean(q && cfg.supports && cfg.supports.q);
  if (serverSearch) params.q = q;
  const res = await api.get(cfg.path, params);
  const items = cfg.shape === "array" ? res || [] : res?.items ?? [];
  let rows = items.map(cfg.row);
  if (q && !serverSearch) {
    const lower = q.toLowerCase();
    rows = rows.filter((r) =>
      Object.entries(r)
        .filter(([k]) => k !== "raw")
        .some(([, v]) => String(v ?? "").toLowerCase().includes(lower)),
    );
  }
  return rows.slice(0, limit);
}

export async function listRecords(resource, p = {}) {
  const cfg = RESOURCES[resource];
  if (!cfg) throw unmappedError(resource);
  let rows = await fetchAll(resource, { q: String(p.search || "").trim() });

  const eq = (obj) => (row) =>
    Object.entries(obj || {}).every(
      ([k, v]) => !v || String(row[k] ?? "") === String(v),
    );
  // base/filters arrive as UI display labels; compare against the labelled row values.
  rows = rows.filter(eq(p.base)).filter(eq(p.filters));

  if (p.range && rows[0]?.iso) {
    rows = rows.filter((r) => r.iso >= p.range.from && r.iso <= p.range.to);
  }

  const q = String(p.search || "").trim().toLowerCase();
  if (q) {
    rows = rows.filter((r) =>
      Object.entries(r)
        .filter(([k]) => k !== "raw")
        .some(([, v]) => String(v ?? "").toLowerCase().includes(q)),
    );
  }

  const tabField = p.tabField || cfg.tabField;
  const counts = {};
  if (tabField) {
    rows.forEach((r) => {
      const v = r[tabField] ?? "—";
      counts[v] = (counts[v] || 0) + 1;
    });
  }
  const all = rows.length;
  // allRows is the scope the stat cards are computed from: everything matching the base,
  // date and search filters, before the active tab narrows the table.
  const scopedRows = rows;
  if (tabField && p.tab && p.tab !== "All") {
    rows = rows.filter((r) => String(r[tabField] ?? "—") === p.tab);
  }

  const page = p.page || 1;
  const pageSize = p.pageSize || 10;
  return {
    rows: rows.slice((page - 1) * pageSize, page * pageSize),
    total: rows.length,
    all,
    counts,
    allRows: scopedRows,
  };
}

export async function getFilterOptions(resource, key) {
  const cfg = RESOURCES[resource];
  if (!cfg) throw unmappedError(resource);
  const rows = await fetchAll(resource);
  return [...new Set(rows.map((r) => r[key]).filter((v) => v !== null && v !== undefined && v !== ""))].sort();
}

// The deep-link select offers the merchant app's real screens plus one escape hatch; choosing
// "External web page" reveals a free-text URL instead of a route.
const deepLink = (v) =>
  v.deepLink === EXTERNAL_DEEP_LINK
    ? v.deepLinkUrl || undefined
    : v.deepLink || undefined;

// A datetime-local input carries the operator's wall-clock time with no zone, while the backend
// stores these columns as naive UTC and compares them with utcnow(). Sending the string as it was
// typed would make a schedule window start or end off by the browser's offset from UTC.
const utcWallClock = (value) => {
  if (!value) return undefined;
  const moment = new Date(value);
  return Number.isNaN(moment.getTime())
    ? value
    : moment.toISOString().slice(0, 19);
};

// PUT /api/settings/v1/{key} upserts, so the same form adds a setting and edits an existing one.
// Only the scope differs between the system and merchant-admin surfaces.
const appSetting =
  (scope) =>
  (v) => ({
    scope,
    label: v.label,
    value: v.value ?? "",
    value_type: delabelize(v.valueType || "string"),
    description: v.description || undefined,
    status: v.status ? delabelize(v.status) : undefined,
  });

// UI form field name -> backend create payload, per resource.
// The `|| undefined` guards matter: undefined keys are stripped in createRecord so the backend
// fills its own defaults instead of receiving an empty string.
const CREATORS = {
  merchants: (v) => ({
    merchant_code: v.id || v.merchant_code || undefined,
    legal_name: v.legalName || v.name,
    display_name: v.name || v.legalName,
    phone: String(v.mobile || "").replace(/\D/g, "") || undefined,
    business_category: v.category || v.mcc || undefined,
    category_code: v.categoryCode || undefined,
    group_code: v.group || v.groupCode || undefined,
    email: v.email || undefined,
    gstin: v.gstin ? String(v.gstin).toUpperCase() : undefined,
    pan: v.pan ? String(v.pan).toUpperCase() : undefined,
    constitution: v.constitution ? delabelize(v.constitution) : undefined,
    product_type: v.productType ? delabelize(v.productType) : undefined,
    // The backend refuses to approve a merchant that carries neither identifier, so the
    // form has to be able to save them; an empty box means "leave it out", not "erase it".
    zaakpay_identifier: v.zaakpay_identifier || v.zaakpay || undefined,
    custom_identifier: v.custom_identifier || v.custom || undefined,
    // MerchantCreate defaults these to false; only send a deliberate change.
    is_master: v.isMaster === true || v.isMaster === "Yes" ? true : undefined,
    split_enabled: v.splitEnabled === true || v.splitEnabled === "Yes" ? true : undefined,
    sales_agent_id:
      v.salesAgent !== undefined && v.salesAgent !== "" ? Number(v.salesAgent) : undefined,
    branch_code: v.branch || v.branchCode || undefined,
    expected_monthly_volume_paise:
      v.turnover !== undefined && v.turnover !== "" ? Math.round(Number(v.turnover) * 100) : undefined,
    average_ticket_paise:
      v.avgTicket !== undefined && v.avgTicket !== "" ? Math.round(Number(v.avgTicket) * 100) : undefined,
  }),
  branches: (v) => ({
    branch_code: v.id || v.branch_code || undefined,
    name: v.name,
    branch_type: delabelize(v.type || "branch"),
    region: v.region || undefined,
    city: v.city || undefined,
    state: v.state || undefined,
    address: v.address || undefined,
    phone: v.phone || undefined,
    email: v.email || undefined,
  }),
  users: (v) => ({
    email: v.email,
    password: v.password,
    full_name: v.name || v.full_name || v.fullName,
    phone: String(v.phone || v.mobile || "").replace(/\D/g, "") || undefined,
    roles: v.role ? [String(v.role).toUpperCase()] : undefined,
    branch_code: v.branch || v.branch_code || undefined,
    region: v.region || undefined,
    team: v.team || undefined,
    merchant_code: v.merchant || v.merchant_code || undefined,
  }),
  // Batches are generated by the backend from the settlement date; the caller picks a date only.
  settlements: (v) => ({ utr_date: v.date || v.utr_date || undefined }),
  agent: (v) => ({ ...CREATORS.users(v), roles: ["COLLECTION_AGENT"] }),
  loans: (v) => ({
    borrower_name: v.borrower || v.applicant || v.borrower_name || v.name,
    product_code: v.product || v.product_code || undefined,
    principal_paise:
      v.principal || v.amount ? Math.round(Number(v.principal || v.amount) * 100) : undefined,
    tenure_months: v.tenure ? Math.round(Number(v.tenure)) : undefined,
    annual_interest_rate_bps:
      v.rate ? Math.round(Number(v.rate) * 100) : undefined,
    borrower_phone: String(v.mobile || v.phone || "").replace(/\D/g, "") || undefined,
    borrower_email: v.email || undefined,
    merchant_code: v.merchant || v.merchant_code || undefined,
  }),
  categories: (v) => ({
    // The code is optional; the backend generates one when omitted. It becomes the path key,
    // so it cannot be changed later.
    category_code: v.code ? String(v.code).trim() : undefined,
    name: v.name,
    // The form asks for a percent, the column stores basis points.
    mdr_bps:
      v.mdr !== undefined && v.mdr !== "" ? Math.round(Number(v.mdr) * 100) : undefined,
    status: v.status ? delabelize(v.status) : undefined,
  }),
  // A device enters stock first; assigning and activating are separate transition routes.
  devices: (v) => ({
    serial_number: v.serial ? String(v.serial).trim() : undefined,
    device_type: v.type ? delabelize(v.type) : undefined,
    model: v.model || undefined,
    firmware_version: v.firmware || undefined,
    manufacturer: v.manufacturer || undefined,
    heartbeat_interval_seconds:
      v.heartbeat !== undefined && v.heartbeat !== "" ? Number(v.heartbeat) : undefined,
    sim_iccid: v.sim || undefined,
  }),
  // Purchase stock is its own ledger: the code is optional (generated when blank) and becomes
  // the path key. A date-only purchase_date is accepted by the backend as midnight UTC.
  inventory: (v) => ({
    inventory_code: v.id ? String(v.id).trim() : undefined,
    device_type: v.type ? delabelize(v.type) : undefined,
    model: v.model || undefined,
    serial_number: v.serial ? String(v.serial).trim() : undefined,
    manufacturer: v.manufacturer || undefined,
    location: v.location || undefined,
    assigned_to: v.assignedTo || undefined,
    vendor: v.vendor || undefined,
    purchase_date: v.purchaseDate || undefined,
    unit_cost_paise:
      v.unitCost !== undefined && v.unitCost !== "" ? Math.round(Number(v.unitCost) * 100) : undefined,
    status: v.status ? delabelize(v.status) : undefined,
    notes: v.notes || undefined,
  }),
  salesDocuments: (v) => ({
    doc_type: delabelize(v.docType),
    file_key: String(v.fileKey || "").trim(),
    file_name: v.fileName || undefined,
  }),
  salesTerritories: (v) => ({
    territory_code: v.id ? String(v.id).trim() : undefined,
    name: v.name,
    region: v.region || undefined,
    state: v.state || undefined,
    city: v.city || undefined,
    pincodes: v.pincodes
      ? String(v.pincodes).split(",").map((s) => s.trim()).filter(Boolean)
      : undefined,
    assigned_user_id:
      v.assignedUserId !== undefined && v.assignedUserId !== "" ? Number(v.assignedUserId) : undefined,
    status: v.status ? delabelize(v.status) : undefined,
  }),
  // Only a dynamic QR is created from the panel. A static QR is issued per merchant and can
  // only be regenerated, not created from here.
  qrs: (v) => ({
    merchant_code: v.merchant || undefined,
    amount_paise:
      v.amount !== undefined && v.amount !== "" ? Math.round(Number(v.amount) * 100) : undefined,
    expires_minutes:
      v.expiresMinutes !== undefined && v.expiresMinutes !== "" ? Number(v.expiresMinutes) : undefined,
    note: v.note || undefined,
  }),
  // An operator can log a ticket on behalf of a merchant. The merchant app raises its own
  // through the same route; this is the assisted desk.
  tickets: (v) => ({
    merchant_code: v.merchant || undefined,
    subject: v.subject,
    description: v.description,
    category: v.category ? delabelize(v.category) : undefined,
    priority: v.priority ? delabelize(v.priority) : undefined,
  }),
  // POST /reports/ingest takes the provider settlement date and starts the ingest run.
  recon: (v) => ({ utr_date: v.date || undefined }),
  groups: (v) => ({
    name: v.name,
    settlement_cycle: settlementCycle(v.settlementCycle),
    owner_merchant_code: v.owner || undefined,
  }),
  // POST /api/reports/v1 generates the CSV synchronously and answers with the report row.
  reports: (v) => ({
    name: v.name,
    report_type: delabelize(v.type || "merchants"),
    date_from: v.from || undefined,
    date_to: v.to || undefined,
  }),
  // The three collection queues are keyed by account reference, which is what the backend
  // requires; the free-text borrower and loan names the mock form used are derived server-side.
  followups: (v) => ({
    account_ref: v.account,
    task_type: delabelize(v.type),
    due_date: v.nextDate || undefined,
    notes: v.notes || undefined,
  }),
  promises: (v) => ({
    account_ref: v.account,
    amount_paise: Math.round(Number(v.amount) * 100),
    promised_date: v.promiseDate,
    notes: v.notes || undefined,
  }),
  receipts: (v) => ({
    account_ref: v.account,
    amount_paise: Math.round(Number(v.amount) * 100),
    channel: delabelize(v.method),
    reference: v.reference || undefined,
  }),
  // App content authoring. The form submits only the fields the selected kind renders (FormModal
  // hides the rest), so an unset field is simply not sent. Placement comes from a curated list
  // unless the operator chose "Other", which reveals a free-text value.
  // "Opens on tap" is a picker over the merchant app's own routes, so the value is already the
  // path the app pushes. Only the "External web page" choice carries a typed URL.
  appContent: (v) => ({
    kind: delabelize(v.kind || "banner"),
    title: v.title,
    subtitle: v.subtitle || undefined,
    body: v.body || undefined,
    image_url: v.imageUrl || undefined,
    icon: v.icon || undefined,
    cta_label: v.ctaLabel || undefined,
    cta_url: v.ctaUrl || undefined,
    deep_link: deepLink(v),
    category: v.category || undefined,
    placement:
      v.placement === "Other"
        ? v.placementSlug || undefined
        : v.placement
          ? delabelize(v.placement)
          : undefined,
    sort_order: v.sort === undefined || v.sort === "" ? undefined : Number(v.sort),
    status: v.status ? delabelize(v.status) : undefined,
    audience: v.audience ? delabelize(v.audience) : undefined,
    is_featured: v.featured === true || v.featured === "Yes",
    starts_at: utcWallClock(v.startsAt),
    ends_at: utcWallClock(v.endsAt),
  }),
  // An inbox notification is either broadcast (no merchant) or targeted at one merchant code.
  // The picker stores a real code or nothing at all, so an empty box is the broadcast.
  merchantNotification: (v) => ({
    merchant_code: v.merchant || undefined,
    title: v.title,
    body: v.body,
    category: delabelize(v.category || "general"),
    deep_link: deepLink(v),
    image_url: v.imageUrl || undefined,
    audience: v.audience ? delabelize(v.audience) : undefined,
  }),
  // A privacy request is filed on behalf of a data subject - there is no self-service intake in
  // the apps yet - so the operator records who asked, for what, and any details.
  privacyRequests: (v) => ({
    subject_type: delabelize(v.subjectType),
    subject_id: String(v.subject || "").trim(),
    request_type: delabelize(v.requestType),
    details: v.details || undefined,
  }),
  // PUT is an upsert, so the same form adds a setting and edits the value an existing key holds.
  sa_config: appSetting("system"),
  settings: appSetting("merchant"),
  c_settings: appSetting("collection"),
};

// MerchantSettlementCycle mixes cases: T0/T1/T2 are upper, weekly and monthly are not.
const settlementCycle = (value) => {
  const v = String(value || "").trim().toLowerCase();
  if (!v) return undefined;
  return v === "weekly" || v === "monthly" ? v : v.toUpperCase();
};

export async function createRecord(resource, values) {
  const cfg = RESOURCES[resource];
  if (!cfg) throw unmappedError(resource);
  const build = CREATORS[resource] || CREATORS[cfg.createsAs];
  if (!build) throw new Error(`${resource} has no create form on the backend.`);
  const body = Object.fromEntries(
    Object.entries(build(values)).filter(([, v]) => v !== undefined && v !== ""),
  );
  const created = await api[cfg.createMethod || "post"](
    cfg.createPathFn ? cfg.createPathFn(values) : cfg.createPath || cfg.path,
    body,
    cfg.createQuery ? cfg.createQuery(values) : undefined,
  );
  // A createPath endpoint answers with a report rather than the created row, so it is not
  // mapped; a createPathFn endpoint (the settings PUT) returns the row itself. The caller
  // reloads the list either way.
  bustFetchCache(resource);
  return cfg.createPathFn || !cfg.createPath ? cfg.row(created) : created;
}

// UI form field name -> backend PATCH body, per resource. The difference from CREATORS is the one
// that matters on an existing row: a create omits a blank box so the backend fills its default,
// while an update sends null for a blank box so the value already stored is actually cleared.
// Omitting it there would leave the old text on the item and the operator would see a Save that
// did nothing.
const EDITORS = {
  appContent: (v) => {
    const body = CREATORS.appContent(v);
    for (const key of [
      "subtitle",
      "body",
      "image_url",
      "icon",
      "cta_label",
      "cta_url",
      "deep_link",
      "category",
      "placement",
      "starts_at",
      "ends_at",
    ]) {
      if (body[key] === undefined) body[key] = null;
    }
    // Not a form field: publish and archive are separate routes that stamp published_at and
    // write their own audit event, so a status box here would be a second, quieter path.
    delete body.status;
    return body;
  },
  // Category PATCH accepts name, MDR and status. The code is the URL key.
  categories: (v) => ({
    name: v.name,
    mdr_bps:
      v.mdr !== undefined && v.mdr !== "" ? Math.round(Number(v.mdr) * 100) : undefined,
    status: v.status ? delabelize(v.status) : undefined,
  }),
  // DeviceUpdate has no serial or device_type: both are fixed at creation. A blank optional
  // text field is sent as null so the stored value is really cleared.
  devices: (v) => ({
    model: v.model || null,
    manufacturer: v.manufacturer || null,
    firmware: v.firmware || undefined,
    heartbeat: v.heartbeat === "" || v.heartbeat === undefined ? undefined : Number(v.heartbeat),
    sim: v.sim || null,
    mid: v.mid || null,
    tid: v.tid || null,
  }),
  // InventoryUpdate accepts every field; unlike a paired device, the serial can be corrected
  // here (the backend still refuses one already in stock). Blank optional boxes send null.
  inventory: (v) => ({
    device_type: v.type ? delabelize(v.type) : undefined,
    model: v.model || null,
    serial_number: v.serial ? String(v.serial).trim() : null,
    manufacturer: v.manufacturer || null,
    location: v.location || null,
    assigned_to: v.assignedTo || null,
    vendor: v.vendor || null,
    purchase_date: v.purchaseDate || null,
    unit_cost_paise:
      v.unitCost === "" || v.unitCost === undefined ? null : Math.round(Number(v.unitCost) * 100),
    status: v.status ? delabelize(v.status) : undefined,
    notes: v.notes || null,
  }),
  // TerritoryUpdate clears region/state/city/assignee with null; pincodes is replaced wholesale
  // (an empty list empties it). The territory code is the path key and is not editable.
  salesTerritories: (v) => ({
    name: v.name || undefined,
    region: v.region || null,
    state: v.state || null,
    city: v.city || null,
    pincodes: String(v.pincodes || "").split(",").map((s) => s.trim()).filter(Boolean),
    assigned_user_id:
      v.assignedUserId === "" || v.assignedUserId === undefined ? null : Number(v.assignedUserId),
    status: v.status ? delabelize(v.status) : undefined,
  }),
  // MerchantUpdate is a partial: blank boxes map to undefined (leave unchanged), the Yes/No
  // selects map to real booleans so an operator can turn a flag back off, and rupees go back to
  // paise. KYC status is deliberately not here - it moves through the onboarding/KYC flow.
  merchants: (v) => ({
    legal_name: v.legalName || undefined,
    display_name: v.name || undefined,
    email: v.email || undefined,
    phone: String(v.mobile || "").replace(/\D/g, "") || undefined,
    business_category: v.category || undefined,
    category_code: v.categoryCode || undefined,
    group_code: v.groupCode || undefined,
    gstin: v.gstin ? String(v.gstin).toUpperCase() : undefined,
    pan: v.pan ? String(v.pan).toUpperCase() : undefined,
    constitution: v.constitution ? delabelize(v.constitution) : undefined,
    product_type: v.productType ? delabelize(v.productType) : undefined,
    zaakpay_identifier: v.zaakpay || undefined,
    custom_identifier: v.custom || undefined,
    is_master: v.isMaster === "Yes" ? true : v.isMaster === "No" ? false : undefined,
    split_enabled: v.splitEnabled === "Yes" ? true : v.splitEnabled === "No" ? false : undefined,
    branch_code: v.branch || undefined,
    sales_agent_id:
      v.salesAgent !== undefined && v.salesAgent !== "" ? Number(v.salesAgent) : undefined,
    expected_monthly_volume_paise:
      v.turnover !== undefined && v.turnover !== "" ? Math.round(Number(v.turnover) * 100) : undefined,
    average_ticket_paise:
      v.avgTicket !== undefined && v.avgTicket !== "" ? Math.round(Number(v.avgTicket) * 100) : undefined,
  }),
  // A setting PATCH changes the stored value/type/label/description/status. The key is the URL
  // and scope is the query, so neither is in the body.
  settings: (v) => settingEditor(v),
  c_settings: (v) => settingEditor(v),
  sa_config: (v) => settingEditor(v),
};

const settingEditor = (v) => ({
  label: v.label,
  value: v.value ?? "",
  value_type: v.valueType ? delabelize(v.valueType) : undefined,
  description: v.description || null,
  status: v.status ? delabelize(v.status) : undefined,
});

// The edit boxes are filled from the backend row, not the table: the columns a person reads are
// lossy on purpose ("Yes"/"No", "Web: https://..."), and saving those words back would corrupt
// the record. `forEdit` is the per-resource inverse of the row mapper.
export function getEditValues(resource, row) {
  const cfg = RESOURCES[resource];
  if (!cfg) throw unmappedError(resource);
  if (!cfg.editable || !cfg.forEdit) {
    throw new Error(`${resource} has no update route on the backend, so this row cannot be edited.`);
  }
  return cfg.forEdit(row);
}

export async function updateRecord(resource, id, values) {
  const cfg = RESOURCES[resource];
  if (!cfg) throw unmappedError(resource);
  if (!cfg.editable || !EDITORS[resource]) {
    throw new Error(
      `${resource} has no update route on the backend, so this row cannot be edited.`,
    );
  }
  const body = Object.fromEntries(
    Object.entries(EDITORS[resource](values)).filter(([, v]) => v !== undefined),
  );
  const patched = await api.patch(
    `${cfg.path}/${encodeURIComponent(id)}`,
    body,
  );
  bustFetchCache(resource);
  return cfg.row(patched);
}

export async function deleteRecord(resource, id) {
  const cfg = RESOURCES[resource];
  if (!cfg) throw unmappedError(resource);
  if (!cfg.deletable) {
    throw new Error(
      `${resource} has no delete route on the backend, so this row cannot be removed.`,
    );
  }
  // 204 with no body: the caller reloads the list, which is the only truth about the row.
  await api.del(`${cfg.path}/${encodeURIComponent(id)}`);
  bustFetchCache(resource);
  return true;
}

// UI actions are label transitions ("Suspended"); the backend exposes explicit transition routes.
const ACTIONS = {
  merchants: [
    {
      when: (r, a) => a.setStatus === "Suspended",
      run: (id) => api.post(`/api/merchants/v1/${encodeURIComponent(id)}/suspend`, {}),
    },
    {
      when: (r, a) => a.setStatus === "Active",
      run: (id) => api.post(`/api/merchants/v1/${encodeURIComponent(id)}/approve`, {}),
    },
  ],
  // The applications list posts the same application transitions as the detail screen. The list
  // has no reason field, so the recorded reason is the fixed text below.
  onboarding: [
    {
      when: (r, a) => a.setStatus === "Approved",
      run: (id) =>
        api.post(`/api/merchant-admin/v1/onboarding/applications/${encodeURIComponent(id)}/approve`),
    },
    {
      when: (r, a) => a.setStatus === "Rejected",
      run: (id) =>
        api.post(`/api/merchant-admin/v1/onboarding/applications/${encodeURIComponent(id)}/reject`, {
          reason: "Rejected from the Merchant Applications list",
        }),
    },
    {
      when: (r, a) => a.setStatus === "Under Review",
      run: (id) =>
        api.post(`/api/merchant-admin/v1/onboarding/applications/${encodeURIComponent(id)}/review`),
    },
  ],
  // Refunding a payment is a create, not a status write: the answer is a RefundOut, and the
  // payment's own status moves when the provider confirms.
  transactions: [
    {
      when: (r, a) => a.setStatus === "Refunded",
      run: (id) =>
        api.post(
          `/api/payments/v1/payments/${encodeURIComponent(id)}/refunds`,
          { amount_paise: null },
          undefined,
          { "Idempotency-Key": `dashboard-refund-${id}-${Date.now()}` },
        ),
    },
  ],
  // Every device transition is POST /api/devices/v1/{numeric id}/{verb}. Only assign carries a
  // body (merchant code + optional terminal ids); the rest are bare verbs. The id is the numeric
  // device id, never the human serial.
  devices: [
    {
      when: (r, a) => a.verb === "assign",
      run: (id, a) =>
        api.post(`/api/devices/v1/${encodeURIComponent(id)}/assign`, {
          merchant_code: a.merchant,
          mid: a.mid || undefined,
          tid: a.tid || undefined,
        }),
    },
    { when: (r, a) => a.verb === "activate", run: (id) => api.post(`/api/devices/v1/${encodeURIComponent(id)}/activate`) },
    { when: (r, a) => a.verb === "disable", run: (id) => api.post(`/api/devices/v1/${encodeURIComponent(id)}/disable`) },
    { when: (r, a) => a.verb === "mark-lost", run: (id) => api.post(`/api/devices/v1/${encodeURIComponent(id)}/mark-lost`) },
    { when: (r, a) => a.verb === "return", run: (id) => api.post(`/api/devices/v1/${encodeURIComponent(id)}/return`) },
  ],
  // A static QR is issued per merchant; "regenerating" mints a fresh payload for that merchant.
  // The route keys on the merchant code from the row, not the QR id. Only static rows offer this.
  qrs: [
    {
      when: (r, a) => a.verb === "regenerate",
      run: (id, a, row) =>
        api.post(`/api/qr/v1/static/${encodeURIComponent(row?.merchant ?? "")}/regenerate`),
    },
  ],
  // Re-running match re-reads stored rows for a provider date without a provider call, so it is
  // not rate-limited the way the ingest (fetch) route is.
  recon: [
    {
      when: (r, a) => a.verb === "match",
      run: (id, a) => api.post("/api/settlement/v1/reports/match", { utr_date: a.date }),
    },
  ],
  sa_maker: [
    {
      when: (r, a) => a.setStatus === "Approved" || a.setStatus === "Rejected",
      run: (id, a) =>
        api.post(`/api/audit/v1/maker-checker/${encodeURIComponent(id)}/decide`, {
          approve: a.setStatus === "Approved",
          note: a.note || undefined,
        }),
    },
  ],
  sa_risk: [
    {
      when: (r, a) => ["Acknowledged", "Resolved", "Dismissed"].includes(a.setStatus),
      run: (id, a) => {
        const verb = { Acknowledged: "acknowledge", Resolved: "resolve", Dismissed: "dismiss" }[a.setStatus];
        return api.post(`/api/risk/v1/alerts/${encodeURIComponent(id)}/${verb}`);
      },
    },
  ],
  tickets: [
    {
      when: (r, a) => Boolean(a.setStatus),
      run: (id, a) =>
        api.patch(`/api/support/v1/tickets/${encodeURIComponent(id)}/status`, {
          status: delabelize(a.setStatus),
        }),
    },
  ],
  // A staff document is verified or rejected through the review route, which stamps the
  // reviewer and the note. "Uploaded" is not a review outcome the backend accepts.
  salesDocuments: [
    {
      when: (r, a) => a.setStatus === "Verified" || a.setStatus === "Rejected",
      run: (id, a) =>
        api.post(`/api/sales/v1/documents/${encodeURIComponent(id)}/review`, {
          status: delabelize(a.setStatus),
          note: a.note || undefined,
        }),
    },
  ],
  c_cases: [
    {
      when: (r, a) => Boolean(a.setStatus),
      run: (id, a) =>
        api.patch(`/api/collection-admin/v1/accounts/${encodeURIComponent(id)}`, {
          status: delabelize(a.setStatus),
        }),
    },
  ],
  // Settlement batches move through maker/checker, release and cancel as separate routes.
  settlements: [
    {
      when: (r, a) => a.verb === "submit",
      run: (id) =>
        api.post(`/api/settlement/v1/batches/${encodeURIComponent(id)}/submit`, {
          maker_id: currentUserId(),
        }),
    },
    {
      when: (r, a) => a.verb === "decision",
      run: (id, a) =>
        api.post(`/api/settlement/v1/batches/${encodeURIComponent(id)}/decision`, {
          checker_id: currentUserId(),
          approve: Boolean(a.approve),
          notes: a.note || undefined,
        }),
    },
    {
      when: (r, a) => a.verb === "release" || a.verb === "cancel",
      run: (id, a) =>
        api.post(`/api/settlement/v1/batches/${encodeURIComponent(id)}/${a.verb}`),
    },
  ],
  payouts: [
    {
      when: (r, a) => a.verb === "initiate" || a.verb === "refresh",
      run: (id, a) =>
        api.post(`/api/settlement/v1/payouts/${encodeURIComponent(id)}/${a.verb}`),
    },
  ],
  sa_legal: [
    {
      when: (r, a) => Boolean(a.setStatus),
      run: (id, a) =>
        api.patch(`/api/consent/v1/privacy-requests/${encodeURIComponent(id)}`, {
          status: delabelize(a.setStatus),
          resolution_note: a.note || undefined,
        }),
    },
  ],
  // Loan applications move through submit -> review -> approve -> disburse -> close, each its own route.
  c_loans: [
    {
      when: (r, a) => ["submit", "review", "approve", "close"].includes(a.verb),
      run: (id, a) =>
        api.post(`/api/loans/v1/loans/${encodeURIComponent(id)}/${a.verb}`),
    },
    {
      when: (r, a) => a.verb === "reject",
      run: (id, a) =>
        api.post(`/api/loans/v1/loans/${encodeURIComponent(id)}/reject`, {
          reason: a.note || "Rejected from the admin dashboard",
        }),
    },
    // Manual KYC: the officer's overall verdict plus any per-document decisions ride along.
    {
      when: (r, a) => a.verb === "kyc",
      run: (id, a) =>
        api.post(`/api/loans/v1/loans/${encodeURIComponent(id)}/kyc`, {
          status: a.status,
          note: a.note || undefined,
          documents:
            a.documents && Object.keys(a.documents).length ? a.documents : undefined,
        }),
    },
    // Disbursement is a manual admin choice — cash or direct-to-account — never automatic.
    {
      when: (r, a) => a.verb === "disburse",
      run: (id, a) =>
        api.post(`/api/loans/v1/loans/${encodeURIComponent(id)}/disburse`, {
          method: a.method,
          reference: a.reference || undefined,
        }),
    },
  ],
  // Completing a task is its own route; the queue row does not accept a status PATCH.
  c_followups: [
    {
      when: (r, a) => a.setStatus === "Completed",
      run: (id) =>
        api.post(`/api/collection-admin/v1/tasks/${encodeURIComponent(id)}/complete`),
    },
  ],
  // A promise is resolved kept or broken through one route that takes the target status.
  c_promises: [
    {
      when: (r, a) => a.setStatus === "Kept" || a.setStatus === "Broken",
      run: (id, a) =>
        api.post(`/api/collection-admin/v1/promises/${encodeURIComponent(id)}/resolve`, {
          status: delabelize(a.setStatus),
        }),
    },
  ],
  // App content uses the same publish/archive shape as legal documents.
  appContent: [
    {
      when: (r, a) => a.setStatus === "Published",
      run: (id) => api.post(`/api/super-admin/v1/content/${encodeURIComponent(id)}/publish`),
    },
    {
      when: (r, a) => a.setStatus === "Archived",
      run: (id) => api.post(`/api/super-admin/v1/content/${encodeURIComponent(id)}/archive`),
    },
  ],
};
// The applications and disbursements lists are the same loan rows, so they share the transitions.
ACTIONS.c_applications = ACTIONS.c_loans;
ACTIONS.c_disb = ACTIONS.c_loans;
// The collection support queue is the same ticket list, so it shares its status route.
ACTIONS.c_tickets = ACTIONS.tickets;

export async function performAction(resource, id, action = {}, row = null) {
  const cfg = RESOURCES[resource];
  if (!cfg) throw unmappedError(resource);
  const candidates = ACTIONS[resource] || [];
  const match = candidates.find((c) => c.when(null, action));
  if (!match) {
    throw new Error(
      `${resource}: action "${action.verb || action.setStatus || "unknown"}" has no backend transition route.`,
    );
  }
  // The caller reloads the list, so the payload is returned as-is: transition routes answer with
  // the resource row, but a refund answers with a RefundOut and a batch generation with a report.
  // The row is forwarded so a route that keys on a row field (e.g. regenerating a static QR by
  // merchant code) can read it; verb routes ignore the extra argument.
  bustFetchCache(resource);
  return match.run(id, action, row);
}

// ---- Support ticket message thread: GET/POST /api/support/v1/tickets/{ref}/messages ----
export async function getTicketMessages(ref) {
  const res = await api.get(
    `/api/support/v1/tickets/${encodeURIComponent(ref)}/messages?limit=200`,
  );
  const items = Array.isArray(res) ? res : res.items || [];
  return items.map((m) => ({
    id: m.id ?? `${m.ticket_id}-${m.created_at}`,
    author: labelize(m.author_type) + (m.author_user_id ? ` #${m.author_user_id}` : ""),
    body: m.body,
    internal: Boolean(m.is_internal),
    createdOn: dateParts(m.created_at).dateTime,
  }));
}

// An operator reply is a SUPPORT-authored message. is_internal marks a note that is not shown to
// the merchant, which is how an agent records private context on the thread.
export async function addTicketMessage(ref, body, isInternal = false) {
  await api.post(`/api/support/v1/tickets/${encodeURIComponent(ref)}/messages`, {
    body,
    author_type: "support",
    is_internal: Boolean(isInternal),
  });
}

// ---- Super admin dashboard: /api/super-admin/v1/dashboard already returns the same six KPIs ----
export async function getSuperAdminDashboard() {
  const d = await api.get("/api/super-admin/v1/dashboard");
  const s = d.summary || {};
  const colours = ["blue", "green", "purple", "amber", "red", "amber"];
  const gmvDelta = s.merchantGmv?.deltaPct;
  const stats = [
    { label: "Merchant GMV", value: moneyOf(s.merchantGmv) },
    { label: "Active Merchants", value: count(s.activeMerchants) },
    { label: "Loan Portfolio", value: moneyOf(s.loanPortfolio) },
    { label: "Pending Approvals", value: count(s.pendingApprovals) },
    { label: "Open Risk Alerts", value: count(s.openRiskAlerts) },
    { label: "Recon Exceptions", value: count(s.reconciliationExceptions) },
  ].map((x, i) => ({
    ...x,
    color: colours[i],
    // Only GMV has a comparable previous window, so the other cards keep no delta.
    delta: i === 0 && gmvDelta != null ? `${gmvDelta > 0 ? "+" : ""}${gmvDelta}%` : null,
    up: gmvDelta == null ? true : gmvDelta >= 0,
  }));

  const volume = (d.paymentVolume || [])
    .slice(-7)
    .reverse()
    .map((v) => ({
      date: v.date,
      upi: Number(v.upi) || 0,
      card: Number(v.card) || 0,
      qr: Number(v.qr) || 0,
      others: Number(v.others) || 0,
      total: Number(v.total) || 0,
      transactions: Number(v.transactions) || 0,
    }));

  // adminUsersByRole is already a [{ role, label, count }] list.
  const rolesDist = (d.adminUsersByRole || []).map((r, i) => ({
    name: r.label || labelize(r.role),
    value: r.count ?? 0,
    color: ["#0F2440", "#1B8AA6", "#FF9F1C", "#1E9E6A"][i % 4],
  }));

  const audit = (d.recentAuditEvents?.items || []).slice(0, 5).map((a) => ({
    id: a.id,
    time: dateParts(a.occurredAt).dateTime,
    user: a.actor?.name || "System",
    action: labelize(a.action),
    entity: `${labelize(a.entityType)}${a.entityId ? ` ${a.entityId}` : ""}`,
    change: a.changeSummary || "—",
    iso: dateParts(a.occurredAt).iso,
  }));

  return {
    stats,
    rolesDist,
    volume,
    // The card overrides this with listDashboardAdmins(); the shape matches so the page renders
    // even when that second call fails.
    admins: (d.administrators?.items || []).slice(0, 5).map((u) => ({
      id: String(u.id ?? ""),
      full_name: u.name,
      role: String(u.role || "").toLowerCase(),
      is_active: String(u.status).toLowerCase() === "active",
      // AdministratorOut.branch is BranchSummaryOut {id, name}, not a bare string.
      branch: u.branch ? { name: u.branch.name || u.branch.id || null } : null,
    })),
    audit,
  };
}

// DashboardSummaryOut reports MoneyOut objects, whose amount is already in rupees (not paise).
const moneyOf = (money) => "₹ " + Math.round(Number(money?.amount) || 0).toLocaleString("en-IN");
const count = (n) => Number(n || 0).toLocaleString("en-IN");

// ---- Merchant admin dashboard ----
export async function getDashboard() {
  const [merchants, payments, devices] = await Promise.all([
    fetchAll("merchants"),
    fetchAll("transactions"),
    fetchAll("devices").catch(() => []),
  ]);

  const settled = ["Approved", "Active", "Rejected", "Suspended"];
  const active = merchants.filter((m) => m.status === "Active").length;
  const pendingOnboarding = merchants.filter(
    (m) => m.onboardingStatus && !settled.includes(m.onboardingStatus),
  ).length;
  const volume = payments
    .filter((p) => p.status === "Success")
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const dayKey = (iso) => iso;
  const byDay = {};
  payments.forEach((p) => {
    const k = dayKey(p.iso);
    if (!k) return;
    byDay[k] = byDay[k] || { UPI: 0, Card: 0, QR: 0, Others: 0 };
    const method = /upi/i.test(p.method) ? "UPI" : /card|rupay|emv/i.test(p.method) ? "Card" : /qr/i.test(p.method) ? "QR" : "Others";
    byDay[k][method] += Number(p.amount) || 0;
  });
  const volumeSeries = Object.entries(byDay)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-14)
    .map(([iso, v]) => {
      // The chart axis is labelled in lakhs, and row amounts are already rupees.
      const lakh = (rupee) => Math.round((rupee / 100000) * 100) / 100;
      return {
        day: dateParts(iso).date.replace(/, \d{4}$/, ""),
        UPI: lakh(v.UPI),
        Card: lakh(v.Card),
        QR: lakh(v.QR),
        Others: lakh(v.Others),
      };
    });

  const onboardingColours = ["#FF9F1C", "#2F6FED", "#1E9E6A", "#CBD5E1", "#8B5CF6", "#D64545"];
  // The card is titled "Total Pending", so only pre-decision statuses belong in the donut.
  const onboardingCounts = {};
  merchants.forEach((m) => {
    if (!m.onboardingStatus || settled.includes(m.onboardingStatus)) return;
    onboardingCounts[m.onboardingStatus] = (onboardingCounts[m.onboardingStatus] || 0) + 1;
  });
  const onboardingRows = Object.entries(onboardingCounts).map(([name, value], i) => ({
    name,
    value,
    color: onboardingColours[i % onboardingColours.length],
  }));

  const catCounts = {};
  merchants.forEach((m) => {
    if (!m.category) return;
    catCounts[m.category] = (catCounts[m.category] || 0) + 1;
  });
  const totalForCats = Object.values(catCounts).reduce((a, b) => a + b, 0) || 1;
  const categories = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => [name, Math.round((count / totalForCats) * 100)]);

  const merchantTotals = {};
  payments.forEach((p) => {
    if (!p.merchant) return;
    merchantTotals[p.merchant] = merchantTotals[p.merchant] || { txns: 0, volume: 0 };
    merchantTotals[p.merchant].txns += 1;
    merchantTotals[p.merchant].volume += Number(p.amount) || 0;
  });
  const topMerchants = Object.entries(merchantTotals)
    .sort((a, b) => b[1].volume - a[1].volume)
    .slice(0, 5)
    .map(([code, t]) => [code, t.txns, Math.round(t.volume)]);

  const deviceCounts = {};
  devices.forEach((d) => {
    deviceCounts[d.status] = (deviceCounts[d.status] || 0) + 1;
  });

  return {
    stats: [
      { label: "Total Merchants", value: merchants.length.toLocaleString("en-IN"), delta: null, up: null, color: "blue" },
      { label: "Active Merchants", value: active.toLocaleString("en-IN"), delta: null, up: null, color: "green" },
      { label: "Pending Onboarding", value: String(pendingOnboarding), delta: null, up: null, color: "amber" },
      { label: "Total Transaction Volume", value: "₹ " + Math.round(volume).toLocaleString("en-IN"), delta: null, up: null, color: "purple" },
    ],
    volume: volumeSeries,
    onboarding: onboardingRows,
    categories,
    // DashboardView always reduces this, so it must exist even when the device feed is empty.
    devices: Object.entries(deviceCounts).map(([name, value], i) => ({
      name,
      value,
      color: onboardingColours[i % onboardingColours.length],
    })),
    topMerchants,
  };
}

export async function getRecentFeeds() {
  const [onboardings, transactions] = await Promise.all([
    fetchAll("onboarding").catch(() => []),
    fetchAll("transactions").catch(() => []),
  ]);
  return {
    onboardings: onboardings.slice(0, 5).map((r) => ({ ...r, salesStaff: r.salesStaff || "-" })),
    transactions: transactions.slice(0, 5),
  };
}

export async function getOnboardingOverview() {
  const rows = await fetchAll("onboarding");
  const counts = {};
  rows.forEach((r) => {
    counts[r.status] = (counts[r.status] || 0) + 1;
  });
  // "Open" is everything that still needs a decision, so Approved/Rejected are settled.
  const open = rows.filter((r) => !["Approved", "Rejected", "Active"].includes(r.status));
  const byDay = {};
  rows.forEach((r) => {
    if (!r.iso) return;
    byDay[r.iso] = byDay[r.iso] || {};
    byDay[r.iso][r.status] = (byDay[r.iso][r.status] || 0) + 1;
  });
  const trend = Object.keys(byDay)
    .sort()
    .slice(-14)
    .map((iso) => ({
      day: dateParts(iso).date.replace(/, \d{4}$/, ""),
      Approved: byDay[iso].Approved || 0,
      "Under Review": (byDay[iso]["Under Review"] || 0) + (byDay[iso].Submitted || 0),
      Rejected: byDay[iso].Rejected || 0,
    }));
  return {
    total: rows.length,
    counts,
    trend,
    recent: rows.slice(0, 5),
    pendingDocs: open.length,
    pendingKyc: open.filter((r) => r.kycStatus !== "Verified").length,
  };
}

// Application documents are real uploads recorded by the app. Each one has a
// document_ref that the review route acts on; the file itself stays in object storage.
function applicationDocument(d) {
  return {
    name: labelize(d.doc_type),
    documentRef: d.document_ref,
    docType: d.doc_type,
    fileKey: d.file_key,
    fileName: d.file_name,
    contentType: d.content_type,
    size: d.size_bytes,
    status: labelize(d.status),
    remarks: d.review_note || "",
    uploadedAt: dateParts(d.uploaded_at).dateTime,
    reviewedAt: dateParts(d.reviewed_at).dateTime,
    raw: d,
  };
}

// The backend tracks KYC as four verification flags on the merchant profile, not as a document
// table. These flags are what the merchant detail Documents tab shows and what "verify" acts on.
const DOC_CHECKS = [
  { name: "PAN Card", check: "pan", flag: "pan_verified" },
  { name: "Aadhaar Card", check: "aadhaar", flag: "aadhaar_verified" },
  { name: "CKYC", check: "ckyc", flag: "ckyc_verified" },
  { name: "Bank Details", check: "bank", flag: "bank_verified" },
];

function kycView(kyc) {
  const verified = (flag) => Boolean(kyc?.[flag]);
  const rejected = kyc?.status === "rejected";
  return {
    bankStatus: verified("bank_verified") ? "Verified" : rejected ? "Failed" : "Pending",
    kycVerified: kyc
      ? {
          pan: verified("pan_verified"),
          aadhaar: verified("aadhaar_verified"),
          ckyc: verified("ckyc_verified"),
          bank: verified("bank_verified"),
        }
      : null,
    // KYCProfileStatus has no partial value, so an unchecked document is never "Invalid" unless
    // the whole profile was rejected.
    documents: DOC_CHECKS.map((d) => ({
      name: d.name,
      status: verified(d.flag) ? "Valid" : rejected ? "Invalid" : "Pending",
      remarks: verified(d.flag) ? `Verified by ${kyc.provider || "provider"}` : "",
      check: d.check,
    })),
  };
}

// ---- Merchant detail ----
// City and address live on the merchant's outlets, not on the merchant record.
async function merchantOutlets(id) {
  const res = await api
    .get(`/api/merchants/v1/${encodeURIComponent(id)}/outlets`, { limit: 200 })
    .catch(() => null);
  return (res?.items ?? []).map((o) => ({
    id: o.outlet_code,
    name: o.name,
    address: o.address,
    city: o.city,
    state: o.state,
    pincode: o.pincode,
    product: labelize(o.product_type),
    qrType: o.qr_type ? labelize(o.qr_type) : "",
    status: labelize(o.status),
  }));
}

async function merchantExtras(id) {
  const [kyc, outlets] = await Promise.all([
    api.get(`/api/kyc/v1/status/${encodeURIComponent(id)}`).catch(() => null),
    merchantOutlets(id),
  ]);
  return { ...kycView(kyc), outlets, city: outlets.find((o) => o.city)?.city || "" };
}

export async function getMerchant(id) {
  const raw = await api.get(`/api/merchants/v1/${encodeURIComponent(id)}`);
  return {
    ...RESOURCES.merchants.row(raw),
    ...(await merchantExtras(id)),
    // The backend keeps no per-merchant event trail; the audit log is queryable by resource if needed.
    history: [],
  };
}

// MerchantUpdate is a whitelist of profile fields and has no `status`, so a PATCH can never
// change the lifecycle state. Reload the detail view instead of returning the bare row: the
// screen keeps using the KYC and outlet sections it already rendered.
export async function updateMerchant(id, patch = {}) {
  const body = CREATORS.merchants(patch);
  // The identifiers belong to the path.
  delete body.merchant_code;
  await api.patch(`/api/merchants/v1/${encodeURIComponent(id)}`, body);
  return getMerchant(id);
}

// Active/suspended are transition routes (POST /suspend, /approve), not PATCHable fields.
export async function setMerchantStatus(id, next) {
  const verb = { Suspended: "suspend", Active: "approve" }[next];
  if (!verb) throw new Error(`"${next}" is not a merchant transition the backend exposes.`);
  await api.post(`/api/merchants/v1/${encodeURIComponent(id)}/${verb}`);
  return getMerchant(id);
}

// The merchant row walks its own lifecycle, separate from the application the app filed.
// These four routes are the only steps the backend's ONBOARDING_TRANSITIONS map allows.
const MERCHANT_STEPS = { submit: "submit", review: "review", approve: "approve", activate: "activate" };

export async function merchantOnboardingStep(id, step) {
  const route = MERCHANT_STEPS[step];
  if (!route) throw new Error(`"${step}" is not an onboarding step the backend exposes.`);
  await api.post(`/api/merchants/v1/${encodeURIComponent(id)}/onboarding/${route}`);
  return getMerchant(id);
}

// Rejecting a merchant writes the reason onto the merchant row. This is not the application
// reject route: passing a merchant code there looks up an application ref and 404s.
export async function rejectMerchant(id, reason) {
  const text = String(reason ?? "").trim();
  if (!text) throw new Error("The backend needs a reason to record.");
  await api.post(`/api/merchants/v1/${encodeURIComponent(id)}/onboarding/reject`, { reason: text.slice(0, 500) });
  return getMerchant(id);
}

// ---- Onboarding / KYC transitions ----
const APPLICATION_PATH = "/api/merchant-admin/v1/onboarding/applications";

// The applications list filters on merchant_code because `q` does not search that column. An
// approved merchant is filed under the paperwork that created it, so the detail screen can
// point back at it without guessing from a business name.
export async function applicationForMerchant(merchantCode) {
  const list = await api.get(APPLICATION_PATH, { merchant_code: merchantCode, limit: 1 });
  const first = (list?.items || [])[0];
  return first ? first.application_ref : "";
}

export async function getApplication(id) {
  const ref = encodeURIComponent(id);
  const [raw, docs] = await Promise.all([
    api.get(`${APPLICATION_PATH}/${ref}`),
    api.get(`${APPLICATION_PATH}/${ref}/documents`).catch(() => ({ items: [] })),
  ]);
  return {
    ...RESOURCES.onboarding.row(raw),
    bankStatus: raw.bank_verified ? "Verified" : raw.status === "rejected" ? "Failed" : "Pending",
    bankAccount: raw.bank_account_last4 ? `**** **** ${raw.bank_account_last4}` : "",
    bankIfsc: raw.bank_ifsc || "",
    documents: (docs.items || []).map(applicationDocument),
    raw,
  };
}

// The app starts an application itself; this is the assisted path where an operator creates a
// merchant record directly. Submitted applications must come through /api/merchant-app/v1.
export async function addApplication(values, submit = true) {
  const created = await api.post("/api/merchants/v1", CREATORS.merchants(values));
  if (submit) {
    return RESOURCES.onboarding.row(
      await api.post(
        `/api/merchants/v1/${encodeURIComponent(created.merchant_code)}/onboarding/submit`,
      ),
    );
  }
  return RESOURCES.onboarding.row(created);
}

export async function verifyDocument(id, document, status) {
  const ref = document?.documentRef || document?.document_ref;
  if (!ref) {
    throw new Error("Only uploaded application documents can be reviewed.");
  }
  const next = delabelize(status);
  if (!["verified", "rejected"].includes(next)) {
    throw new Error(`"${status}" is not a document review outcome.`);
  }
  await api.post(
    `/api/merchant-admin/v1/onboarding/documents/${encodeURIComponent(ref)}/review`,
    { status: next, note: document.remarks || undefined },
  );
  return getApplication(id);
}

// The app captures only the last four digits and IFSC, so the admin cannot replay a penny drop.
// An operator confirms the bank proof and records the check instead.
export async function verifyBank(id) {
  await api.post(`${APPLICATION_PATH}/${encodeURIComponent(id)}/bank/verify`);
  return getApplication(id);
}

// The transition routes answer with the bare application row; the detail screen also shows the
// documents and bank state, so reload the full view instead of half-replacing it in state.
export async function startApplicationReview(id) {
  await api.post(`${APPLICATION_PATH}/${encodeURIComponent(id)}/review`);
  return getApplication(id);
}

export async function approveApplication(id) {
  await api.post(`${APPLICATION_PATH}/${encodeURIComponent(id)}/approve`);
  return getApplication(id);
}

export async function rejectApplication(id, reason, remarks) {
  await api.post(`${APPLICATION_PATH}/${encodeURIComponent(id)}/reject`, {
    reason: `${reason}${remarks ? `: ${remarks}` : ""}`,
  });
  return getApplication(id);
}

// ---- Collection dashboard ----
export async function getCollectionDashboard() {
  const [dash, loans, cases, receipts, emi] = await Promise.all([
    api.get("/api/collection-admin/v1/dashboard"),
    fetchAll("c_loans").catch(() => []),
    fetchAll("c_cases").catch(() => []),
    fetchAll("c_payments").catch(() => []),
    fetchAll("c_emi").catch(() => []),
  ]);

  const summary = dash?.summary || {};
  const outstanding = rupees(summary.total_outstanding_paise) || 0;
  const collectedToday = rupees(summary.collected_today_paise) || 0;

  // summary.buckets counts accounts per bucket; the donut is rupee-denominated, so total the
  // outstanding of the fetched accounts by bucket instead.
  const byBucket = {};
  cases.forEach((c) => {
    if (!c.bucket) return;
    byBucket[c.bucket] = (byBucket[c.bucket] || 0) + (Number(c.outstanding) || 0);
  });
  const bucketColours = ["#D64545", "#FF9F1C", "#F5C84C", "#8B5CF6", "#2F6FED", "#94A3B8"];
  const aging = Object.entries(byBucket)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({ name: name.toUpperCase(), value, color: bucketColours[i % 6] }));

  const statusCounts = {};
  loans.forEach((l) => {
    statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
  });

  const overdueCases = cases.filter((c) => (c.dpd || 0) > 0);
  // A receipt only exists once money has been taken in, so the newest five are the feed.
  const recentPayments = [...receipts]
    .sort((a, b) => (a.iso < b.iso ? 1 : -1))
    .slice(0, 5)
    .map((r) => ({ ...r, status: "Collected" }));
  // EMIs due today or earlier and still unpaid. Rows carry `account` (the
  // collection account ref joined backend-side), so these can be collected
  // directly; rows without an account fall back to the collections screen.
  const now = today();
  const dueToday = emi
    .filter((e) => e.iso <= now && e.status !== "Paid")
    .slice(0, 5);

  return {
    stats: [
      { label: "Total Loan Portfolio", value: rupeeText(outstanding), color: "blue" },
      { label: "Total Accounts", value: count(summary.total_accounts), color: "amber" },
      { label: "Collected Today", value: rupeeText(collectedToday), color: "green" },
      { label: "Active Accounts", value: count(summary.active_accounts), color: "purple" },
      { label: "Open Tasks", value: count(summary.open_tasks), color: "red" },
      { label: "Open Promises", value: count(summary.open_promises), color: "amber" },
    ],
    trend: (dash?.trend || []).map((t) => ({
      day: t.day,
      Due: rupees(t.due_paise) || 0,
      Collected: rupees(t.collected_paise) || 0,
    })),
    aging,
    loanStatus: Object.entries(statusCounts).map(([name, value], i) => ({
      name,
      value,
      color: ["#1E9E6A", "#FF9F1C", "#94A3B8", "#2F6FED"][i % 4],
    })),
    totalOverdue: overdueCases.reduce((s, c) => s + (Number(c.outstanding) || 0), 0),
    totalLoans: loans.length,
    recentPayments,
    topOverdue: [...overdueCases]
      .sort((a, b) => (b.outstanding || 0) - (a.outstanding || 0))
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        borrower: c.borrower,
        loan: c.loanId ?? "—",
        overdue: c.outstanding,
        dpd: c.dpd,
        risk: c.bucket || "—",
      })),
    dueToday,
    dueTodayCount: dueToday.length,
    agents: (dash?.agents || []).map((a) => ({
      id: String(a.agent_id),
      name: a.agent_name || `Agent ${a.agent_id}`,
      collected: rupees(a.collected_paise) || 0,
      target: rupees(a.target_paise) || 0,
      achievement: a.achievement_pct == null ? "—" : `${a.achievement_pct}%`,
    })),
  };
}

const today = () => new Date().toISOString().slice(0, 10);
const rupeeText = (rupees_) => "₹ " + Math.round(rupees_ || 0).toLocaleString("en-IN");

export async function getCollectionAutoPayOverview() {
  const [plans, debits, aging] = await Promise.all([
    api.get("/api/collection-admin/v1/plans").catch(() => []),
    api.get("/api/collection-admin/v1/debits/pending").catch(() => []),
    api.get("/api/collection-admin/v1/aging").catch(() => []),
  ]);
  return { plans, pendingDebits: debits, aging, restricted: false };
}

export async function reconcilePendingDebits() {
  return api.post("/api/collection-admin/v1/debits/reconcile");
}

export async function collectEmi(accountRef, values = {}) {
  let amountPaise = Math.round(Number(values.amount) * 100);
  if (!amountPaise) {
    const account = await api.get(
      `/api/collection-admin/v1/accounts/${encodeURIComponent(accountRef)}`,
    );
    amountPaise = Number(account?.outstanding_paise) || 0;
  }
  if (!amountPaise) throw new Error("This account has nothing outstanding to collect.");
  const receipt = await api.post("/api/collection-admin/v1/receipts", {
    account_ref: accountRef,
    amount_paise: amountPaise,
    channel: delabelize(values.method || "cash"),
    reference: values.reference || undefined,
  });
  return {
    id: String(receipt?.id ?? ""),
    amount: rupees(receipt?.amount_paise ?? amountPaise),
    status: "Success",
  };
}

// ---- Loan review: manual KYC + disbursement ----
// The review screen reads one loan straight from the feature route so it sees the freshest
// status, the masked identity and the uploaded documents rather than a stale list row.
export async function getLoan(ref) {
  const raw = await api.get(`/api/loans/v1/loans/${encodeURIComponent(ref)}`);
  return RESOURCES.c_loans.row(raw);
}

// A document opens through a short-lived presigned link. The key must already belong to this
// loan; the backend rejects a key borrowed from another application.
export async function getLoanDocumentUrl(ref, key) {
  const d = await api.get(
    `/api/loans/v1/loans/${encodeURIComponent(ref)}/document-url`,
    { key },
  );
  return { url: d.url, key: d.key, expiresIn: d.expires_in };
}

// Existing exposure: every loan already filed against this borrower's phone, so the officer
// sees what is outstanding before approving another. Read-only; it never blocks the decision.
export async function getBorrowerLoans(phone) {
  const res = await api.get("/api/loans/v1/loans", {
    borrower_phone: phone,
    limit: 50,
  });
  return (res?.items ?? []).map(RESOURCES.c_loans.row);
}

export { RESOURCES, UNMAPPED, MAX_ROWS };

// Report rows carry a backend path, not a public link: the memory storage backend serves no
// static route, so the CSV is streamed through the authenticated client and saved here.
export async function getFileText(path) {
  return api.getText(path);
}

// Banner and inbox artwork is stored by the backend, which puts it in the configured object
// store. The value the operator saves on the record is the returned key: a private bucket's
// signed URL expires, the stored object does not.
export async function uploadMedia(file, folder = "banners") {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);
  return api.upload("/api/super-admin/v1/content/media", form);
}

// Notification health is derived by the backend from its own settings and from
// the outcomes recorded in the `notifications` table, so the panel repeats what
// it was told and never claims a vendor is up.
export async function getNotificationHealth() {
  const d = await api.get("/api/notifications/v1/providers/status");
  const q = d.queue || {};

  return {
    overall: d.overall || "idle",
    generatedAt: d.generated_at,
    windowMinutes: Number(d.window_minutes) || 0,
    queue: {
      queued: Number(q.queued) || 0,
      held: Number(q.held) || 0,
      oldestQueuedAt: q.oldest_queued_at || null,
      maxRows: Number(q.max_rows) || 0,
      ttlMinutes: Number(q.ttl_minutes) || 0,
      isFull: Boolean(q.is_full),
    },
    channels: (d.channels || []).map((c) => ({
      channel: c.channel,
      provider: c.provider,
      state: c.state,
      isStub: Boolean(c.is_stub),
      credentialsPresent: Boolean(c.credentials_present),
      configError: c.config_error || null,
      holdsTraffic: Boolean(c.holds_traffic),
      queued: Number(c.queued) || 0,
      windowMinutes: Number(c.window_minutes) || Number(d.window_minutes) || 0,
      samples: Number(c.samples) || 0,
      successes: Number(c.successes) || 0,
      failures: Number(c.failures) || 0,
      successRate: c.success_rate ?? null,
      consecutiveFailures: Number(c.consecutive_failures) || 0,
      lastAttemptAt: c.last_attempt_at || null,
      lastSuccessAt: c.last_success_at || null,
      lastError: c.last_error || null,
    })),
  };
}

// The operator's "do not wait for the backoff" button. The backend drains the
// same durable queue the worker does, so a second press cannot double-send.
export async function drainNotificationQueue(limit = 100) {
  const r = await api.post("/api/notifications/v1/retry", {
    limit,
    older_than_seconds: 0,
  });

  return {
    checked: Number(r?.checked) || 0,
    delivered: Number(r?.delivered) || 0,
    failed: Number(r?.failed) || 0,
    dropped: Number(r?.dropped) || 0,
    expired: Number(r?.expired) || 0,
    held: Number(r?.held) || 0,
    queued: Number(r?.queued) || 0,
    heldChannels: r?.held_channels || [],
  };
}
