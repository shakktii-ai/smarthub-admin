import { labelize, localWallClock, rupees, dateParts, utcDate } from "@/lib/api/labels";
import { deepLinkLabel, EXTERNAL_DEEP_LINK, MERCHANT_APP_SCREENS } from "@/lib/deepLinks";
import { PLACEMENT_LABELS, PLACEMENT_OTHER } from "@/config/appContent";

// Backend timestamps are naive UTC, so they are read back through utcDate() before formatting.
const stamped = (value) => {
  const moment = utcDate(value);
  return moment ? dateParts(moment).dateTime : "";
};

// /api/merchant-app/v1/content serves an item only while it is published and inside its
// schedule window, so a Published row can still be invisible to the app. Name the reason.
const contentServing = (c) => {
  if (c.status !== "published") return labelize(c.status);
  const now = new Date();
  const from = utcDate(c.starts_at);
  const until = utcDate(c.ends_at);
  if (from && from > now) return `Live from ${stamped(c.starts_at)}`;
  if (until && until < now) return `Expired ${stamped(c.ends_at)}`;
  return "Live now";
};

const SCREEN_PATHS = new Set(MERCHANT_APP_SCREENS.map(([, path]) => path));

// The edit form is the create form with this row's own values in the boxes, so everything is read
// off `raw` in the wire vocabulary and converted back. The display columns are lossy on purpose
// ("Yes"/"No", "Web: https://…"), and pre-filling from them would save those words into the row.
const contentForEdit = (row) => {
  const c = row.raw || {};
  const link = c.deep_link || "";
  const onScreen = SCREEN_PATHS.has(link);
  const placement = PLACEMENT_LABELS.get(c.placement);
  return {
    kind: labelize(c.kind),
    title: c.title || "",
    subtitle: c.subtitle || "",
    body: c.body || "",
    imageUrl: c.image_url || "",
    icon: c.icon || "",
    ctaLabel: c.cta_label || "",
    ctaUrl: c.cta_url || "",
    // A link that is not one of the app's screens stays visible on the external choice rather
    // than vanishing into a blank box, because that is what the row actually holds.
    deepLink: link ? (onScreen ? link : EXTERNAL_DEEP_LINK) : "",
    deepLinkUrl: link && !onScreen ? link : "",
    category: c.category || "",
    placement: placement || (c.placement ? PLACEMENT_OTHER : ""),
    placementSlug: placement ? "" : c.placement || "",
    audience: labelize(c.audience),
    featured: !!c.is_featured,
    sort: c.sort_order ?? 0,
    startsAt: localWallClock(c.starts_at),
    endsAt: localWallClock(c.ends_at),
  };
};

// AdminUserOut nests the branch as BranchSummary {branch_code, name}; UserOut keeps a flat code.
const branchOf = (u) => u.branch?.name || u.branch?.branch_code || u.branch_code || null;

// bps -> "1.50%"
const percent = (bps) => `${(Number(bps || 0) / 100).toFixed(2)}%`;
const kb = (bytes) => `${(Number(bytes || 0) / 1024).toFixed(1)} KB`;
// The four KYC checks are booleans; the table reads better with a word than a tick.
const verdict = (ok) => (ok ? "Verified" : "Pending");

// One endpoint, three scopes: each dashboard lists only its own settings.
const settingsResource = (scope) => ({
  path: "/api/settings/v1",
  fixedQuery: { scope },
  shape: "paged",
  supports: { q: true, status: true, offset: true },
  query: { status: "status" },
  // PUT /api/settings/v1/{key} is an upsert, so one form both creates a setting and edits the
  // value an existing key holds; the scope travels in the body, not the query.
  createMethod: "put",
  createPathFn: (v) => `/api/settings/v1/${encodeURIComponent(String(v.key).trim())}`,
  // A setting is edited and deleted by its key, but PATCH/DELETE scope the lookup with
  // ?scope=..., unlike PUT which carries scope in the body. Both mutations need that query.
  editable: true,
  deletable: true,
  updateQuery: { scope },
  deleteQuery: { scope },
  row: (s) => ({
    id: s.setting_key,
    name: s.label,
    key: s.setting_key,
    value: s.value,
    type: labelize(s.value_type),
    scope: labelize(s.scope),
    description: s.description,
    updatedBy: s.updated_by,
    status: labelize(s.status),
    updatedOn: dateParts(s.updated_at).dateTime,
    iso: dateParts(s.created_at).iso,
    raw: s,
  }),
  // The edit form is the create form minus the key: the key is part of the path, so changing it
  // would create a second setting rather than rename this one.
  forEdit: (row) => {
    const s = row.raw || {};
    return {
      label: s.label,
      valueType: labelize(s.value_type),
      value: s.value ?? "",
      description: s.description || "",
      status: labelize(s.status),
    };
  },
});

// resource name (from data/pages/*.js `resource:`) -> the FastAPI endpoint that serves it.
// `shape` is how the backend returns the list: "paged" = {items,total,limit,offset},
// "array" = a bare JSON array. `supports` records which query params the endpoint accepts, so
// filtering that the API cannot do is applied locally instead of being silently dropped.
//
// Row keys are the camelCase column keys the page configs declare. Anything the backend does not
// model (e.g. merchant "city", payment "utr") is deliberately omitted rather than invented.

export const RESOURCES = {
  merchants: {
    path: "/api/merchants/v1",
    shape: "paged",
    supports: { q: true, status: true, offset: true },
    query: { category: "business_category", status: "status" },
    // PATCH /{merchant_code} accepts MerchantUpdate; DELETE /{merchant_code} archives the
    // merchant (soft-delete), so the panel offers both an edit box and a delete button.
    editable: true,
    deletable: true,
    row: (m) => ({
      id: m.merchant_code,
      name: m.display_name,
      legalName: m.legal_name,
      mcc: m.business_category,
      category: m.business_category,
      mobile: m.phone,
      email: m.email,
      gstin: m.gstin,
      pan: m.pan,
      entityType: m.constitution,
      turnover: rupees(m.expected_monthly_volume_paise),
      avgTicket: rupees(m.average_ticket_paise),
      kycStatus: labelize(m.kyc_status),
      onboardingStatus: labelize(m.onboarding_status),
      status: labelize(m.status),
      // MerchantOut exposes the numeric branch id, not the code.
      branchCode: m.branch_id == null ? null : String(m.branch_id),
      submittedOn: dateParts(m.created_at).date,
      approvedOn: dateParts(m.approved_at).date,
      iso: dateParts(m.created_at).iso,
      raw: m,
    }),
    // Inverse of the row mapper for the editable fields: paise back to rupees for the number
    // boxes, enums back to display labels for the selects, branch id back to a plain string.
    // The merchant code is the path key, so it is not part of the edit form.
    forEdit: (row) => {
      const m = row.raw || {};
      return {
        name: m.display_name || "",
        legalName: m.legal_name || "",
        mobile: m.phone || "",
        email: m.email || "",
        category: m.business_category || "",
        categoryCode: m.category_code || "",
        groupCode: m.group_code || "",
        constitution: labelize(m.constitution),
        productType: labelize(m.product_type),
        gstin: m.gstin || "",
        pan: m.pan || "",
        zaakpay: m.zaakpay_identifier || "",
        custom: m.custom_identifier || "",
        isMaster: m.is_master ? "Yes" : "No",
        splitEnabled: m.split_enabled ? "Yes" : "No",
        branch: m.branch_id == null ? "" : String(m.branch_id),
        salesAgent: m.sales_agent_id ?? "",
        turnover: m.expected_monthly_volume_paise != null ? Number(m.expected_monthly_volume_paise) / 100 : "",
        avgTicket: m.average_ticket_paise != null ? Number(m.average_ticket_paise) / 100 : "",
      };
    },
  },

  // Self-service merchant applications captured by the app, reviewed by Merchant Admin.
  onboarding: {
    path: "/api/merchant-admin/v1/onboarding/applications",
    shape: "paged",
    supports: { q: true, status: true, offset: true },
    query: { status: "status" },
    tabField: "status",
    row: (a) => ({
      id: a.application_ref,
      merchant: a.business_name || a.owner_name || a.phone,
      legalName: a.business_name,
      owner: a.owner_name,
      category: a.business_category,
      mobile: a.phone,
      email: a.email,
      gstin: a.gstin,
      pan: a.pan_masked,
      city: a.city,
      address: a.address,
      status: labelize(a.status),
      kycStatus: a.pan_verified && a.bank_verified ? "Verified" : "Pending",
      appliedOn: dateParts(a.submitted_at || a.created_at).date,
      approvedOn: a.status === "approved" ? dateParts(a.reviewed_at).date : "",
      rejectionReason: a.rejection_reason || "",
      iso: dateParts(a.created_at).iso,
      raw: a,
    }),
  },

  transactions: {
    path: "/api/payments/v1/payments",
    shape: "paged",
    supports: { q: false, status: true, offset: true },
    query: { status: "status", merchant: "merchant_code" },
    row: (p) => ({
      id: p.order_id,
      dateTime: dateParts(p.created_at).dateTime,
      date: dateParts(p.created_at).date,
      merchant: p.merchant_code,
      method: p.provider,
      channel: p.checkout_method,
      amount: rupees(p.amount_paise),
      currency: p.currency,
      status: labelize(p.status),
      responseCode: p.response_code,
      responseDescription: p.response_description,
      iso: dateParts(p.created_at).iso,
      raw: p,
    }),
  },

  devices: {
    path: "/api/devices/v1",
    shape: "paged",
    supports: { q: true, status: true, offset: true },
    query: { status: "status", merchant: "merchant_code", type: "device_type" },
    // Every mutating device route is /api/devices/v1/{numeric id}. The serial is the human key,
    // not the path key, so the row carries both and actions/edit use the numeric one.
    editable: true,
    row: (d) => ({
      id: String(d.id),
      serial: d.serial_number,
      name: d.model,
      model: d.model,
      type: labelize(d.device_type),
      merchant: d.merchant_code,
      status: labelize(d.status),
      firmware: d.firmware_version,
      mid: d.mid,
      tid: d.tid,
      lastSeen: dateParts(d.last_heartbeat_at).dateTime,
      location: d.location,
      iso: dateParts(d.created_at).iso,
      raw: d,
    }),
    // DeviceUpdate accepts these fields only. serial_number and device_type are created once
    // and have no update route, so they are not offered on the edit form.
    forEdit: (row) => {
      const d = row.raw || {};
      return {
        model: d.model || "",
        manufacturer: d.manufacturer || "",
        firmware: d.firmware_version || "",
        heartbeat: d.heartbeat_interval_seconds ?? "",
        sim: d.sim_iccid || "",
        mid: d.mid || "",
        tid: d.tid || "",
      };
    },
  },

  // Purchase stock: devices bought from vendors before they are paired. Separate from the
  // paired-device registry above; the path key is the generated inventory code.
  inventory: {
    path: "/api/inventory/v1",
    shape: "paged",
    supports: { q: true, status: true, offset: true },
    query: { status: "status", type: "device_type" },
    editable: true,
    deletable: true,
    row: (i) => ({
      id: i.inventory_code,
      type: labelize(i.device_type),
      model: i.model,
      serial: i.serial_number,
      manufacturer: i.manufacturer,
      location: i.location,
      assignedTo: i.assigned_to,
      vendor: i.vendor,
      unitCost: rupees(i.unit_cost_paise),
      purchasedOn: dateParts(i.purchase_date).date,
      status: labelize(i.status),
      addedOn: dateParts(i.created_at).date,
      iso: dateParts(i.created_at).iso,
      raw: i,
    }),
    forEdit: (row) => {
      const i = row.raw || {};
      return {
        type: labelize(i.device_type),
        model: i.model || "",
        serial: i.serial_number || "",
        manufacturer: i.manufacturer || "",
        location: i.location || "",
        assignedTo: i.assigned_to || "",
        vendor: i.vendor || "",
        unitCost: i.unit_cost_paise != null ? Number(i.unit_cost_paise) / 100 : "",
        purchaseDate: i.purchase_date ? String(i.purchase_date).slice(0, 10) : "",
        status: labelize(i.status),
        notes: i.notes || "",
      };
    },
  },

  tickets: {
    path: "/api/support/v1/tickets",
    createsAs: "tickets",
    shape: "paged",
    supports: { q: true, status: true, offset: true },
    query: { status: "status", priority: "priority", category: "category", merchant: "merchant_code" },
    row: (t) => ({
      id: t.ticket_ref,
      subject: t.subject,
      description: t.description,
      category: t.category,
      merchant: t.merchant_code,
      priority: t.priority,
      status: labelize(t.status),
      raised: dateParts(t.created_at).date,
      lastMessage: dateParts(t.last_message_at).dateTime,
      resolution: t.resolution,
      iso: dateParts(t.created_at).iso,
      raw: t,
    }),
  },

  notifications: {
    path: "/api/notifications/v1/logs",
    shape: "paged",
    supports: { q: false, status: true, offset: true },
    query: { status: "status", channel: "channel" },
    dateRange: { from: "date_from", to: "date_to" },
    row: (n) => ({
      id: String(n.id),
      channel: labelize(n.channel),
      to: n.to,
      template: n.template_id,
      provider: n.provider,
      status: labelize(n.status),
      attempts: n.attempts,
      error: n.error,
      sentOn: dateParts(n.sent_at || n.created_at).dateTime,
      iso: dateParts(n.created_at).iso,
      raw: n,
    }),
  },

  // Sales staff are identity users carrying the SALES_MANAGER role.
  sales: {
    path: "/api/identity/v1/users",
    shape: "paged",
    supports: { q: true, status: true, offset: true },
    fixedQuery: { role: "SALES_MANAGER" },
    createsAs: "users",
    query: { status: "status" },
    row: (u) => ({
      id: String(u.id),
      name: u.full_name || u.email,
      fullName: u.full_name,
      email: u.email,
      mobile: u.phone,
      role: (u.roles || []).join(", "),
      status: labelize(u.status),
      branch: branchOf(u),
      lastLogin: dateParts(u.last_login_at).dateTime,
      iso: dateParts(u.created_at).iso,
      raw: u,
    }),
  },

  // Sales territories and the staff-document verification queue. Documents are uploaded per
  // staff member (POST /staff/{user_id}/documents); this list spans all staff so an operator
  // can work the queue, and the review route records the outcome.
  salesTerritories: {
    path: "/api/sales/v1/territories",
    shape: "paged",
    supports: { q: true, status: true, offset: true },
    query: { status: "status" },
    editable: true,
    deletable: true,
    row: (t) => ({
      id: t.territory_code,
      name: t.name,
      region: t.region,
      state: t.state,
      city: t.city,
      pincodes: (t.pincodes || []).join(", "),
      assignedTo:
        t.assigned_user_name ||
        (t.assigned_user_id != null ? `User ${t.assigned_user_id}` : ""),
      status: labelize(t.status),
      createdOn: dateParts(t.created_at).date,
      iso: dateParts(t.created_at).iso,
      raw: t,
    }),
    forEdit: (row) => {
      const t = row.raw || {};
      return {
        name: t.name || "",
        region: t.region || "",
        state: t.state || "",
        city: t.city || "",
        pincodes: (t.pincodes || []).join(", "),
        assignedUserId: t.assigned_user_id ?? "",
        status: labelize(t.status),
      };
    },
  },

  salesDocuments: {
    path: "/api/sales/v1/documents",
    createPathFn: (v) => `/api/sales/v1/staff/${encodeURIComponent(v.staff)}/documents`,
    shape: "paged",
    supports: { q: true, status: true, offset: true },
    query: { status: "status", staff: "user_id" },
    tabField: "status",
    row: (d) => ({
      id: d.document_ref,
      staff: d.user_id,
      docType: labelize(d.doc_type),
      fileName: d.file_name,
      fileKey: d.file_key,
      status: labelize(d.status),
      remarks: d.review_note || "",
      uploadedOn: stamped(d.uploaded_at),
      reviewedOn: stamped(d.reviewed_at),
      iso: dateParts(d.uploaded_at).iso,
      raw: d,
    }),
  },

  admins: {
    path: "/api/identity/v1/users",
    shape: "paged",
    supports: { q: true, status: true, offset: true },
    query: { status: "status", role: "role", branch: "branch_code" },
    createsAs: "users",
    row: (u) => ({
      id: String(u.id),
      name: u.full_name || u.email,
      full_name: u.full_name,
      email: u.email,
      phone: u.phone,
      role: (u.roles || [])[0] || "",
      roles: u.roles || [],
      status: labelize(u.status),
      is_active: u.status === "active",
      email_verified: u.email_verified,
      mfa_enabled: u.mfa_enabled,
      branch: branchOf(u),
      region: u.region,
      team: u.team,
      merchant_code: u.merchant_code,
      lastLogin: dateParts(u.last_login_at).dateTime,
      iso: dateParts(u.created_at).iso,
      raw: u,
    }),
  },

  branches: {
    path: "/api/branches/v1",
    shape: "paged",
    supports: { q: true, status: true, offset: true },
    query: { status: "status", type: "branch_type", region: "region" },
    row: (b) => ({
      id: b.branch_code,
      branch_code: b.branch_code,
      name: b.name,
      type: labelize(b.branch_type),
      region: b.region,
      city: b.city,
      state: b.state,
      address: b.address,
      phone: b.phone,
      email: b.email,
      status: labelize(b.status),
      iso: dateParts(b.created_at).iso,
      raw: b,
    }),
  },

  settlements: {
    path: "/api/settlement/v1/batches",
    createPath: "/api/settlement/v1/batches/generate",
    shape: "array",
    supports: { q: false, status: true, offset: false },
    fetchLimit: 500,
    query: { status: "status", date: "utr_date" },
    row: (b) => ({
      id: b.batch_ref,
      batch_ref: b.batch_ref,
      provider: b.provider,
      merchant: b.merchant_code,
      date: dateParts(b.utr_date).date,
      status: labelize(b.status),
      gross: rupees(b.gross_paise),
      refund: rupees(b.refund_paise),
      fee: rupees(b.fee_paise),
      tax: rupees(b.tax_paise),
      net: rupees(b.net_paise),
      transactions: b.item_count,
      approvedOn: dateParts(b.approved_at).date,
      releasedOn: dateParts(b.released_at).date,
      iso: dateParts(b.utr_date || b.created_at).iso,
      raw: b,
    }),
  },

  payouts: {
    path: "/api/settlement/v1/payouts",
    shape: "array",
    supports: { q: false, status: true, offset: false },
    fetchLimit: 500,
    query: { status: "status" },
    row: (p) => ({
      id: p.reference,
      reference: p.reference,
      merchant: p.merchant_code,
      batch: p.batch_id,
      provider: p.provider,
      amount: rupees(p.amount_paise),
      currency: p.currency,
      status: labelize(p.status),
      initiatedOn: dateParts(p.initiated_at).date,
      completedOn: dateParts(p.completed_at).date,
      failureReason: p.failure_reason,
      iso: dateParts(p.created_at).iso,
      raw: p,
    }),
  },

  sa_maker: {
    path: "/api/audit/v1/maker-checker",
    shape: "paged",
    supports: { q: false, status: true, offset: true },
    query: { status: "status" },
    row: (m) => ({
      id: String(m.id),
      request_id: m.id,
      action: labelize(m.action),
      resourceType: m.action,
      status: labelize(m.status),
      note: m.decision_note,
      raisedOn: dateParts(m.created_at).date,
      decidedOn: dateParts(m.decided_at).date,
      iso: dateParts(m.created_at).iso,
      raw: m,
    }),
  },

  sa_risk: {
    path: "/api/risk/v1/alerts",
    shape: "paged",
    supports: { q: true, status: true, offset: true },
    query: { status: "status", severity: "severity", type: "alert_type" },
    row: (a) => ({
      id: a.alert_ref,
      title: a.title,
      description: a.description,
      type: labelize(a.alert_type),
      severity: labelize(a.severity),
      status: labelize(a.status),
      merchant: a.merchant_id,
      assignedTo: a.assigned_to,
      raisedOn: dateParts(a.created_at).dateTime,
      iso: dateParts(a.created_at).iso,
      raw: a,
    }),
  },

  sa_ledger: {
    path: "/api/ledger/v1/entries",
    shape: "paged",
    supports: { q: false, status: false, offset: true },
    fetchLimit: 500,
    // A ledger entry is double-sided: the amount lives on each posting, tagged debit or credit.
    row: (e) => {
      const postings = e.postings || [];
      const total = (direction) =>
        rupees(
          postings
            .filter((p) => String(p.direction).toLowerCase() === direction)
            .reduce((s, p) => s + (Number(p.amount_paise) || 0), 0),
        );
      const account = [
        ...new Set(postings.map((p) => `${p.account_code} ${p.account_name}`.trim())),
      ].join(", ");
      return {
        id: e.event_key ?? String(e.id ?? ""),
        eventKey: e.event_key,
        description: e.description,
        account,
        referenceType: e.reference_type,
        referenceId: e.reference_id,
        debit: total("debit"),
        credit: total("credit"),
        amount: total("debit") || total("credit"),
        postedOn: dateParts(e.occurred_at || e.created_at).date,
        dateTime: dateParts(e.occurred_at || e.created_at).dateTime,
        iso: dateParts(e.occurred_at || e.created_at).iso,
        raw: e,
      };
    },
  },

  sa_legal: {
    path: "/api/consent/v1/privacy-requests",
    createsAs: "privacyRequests",
    shape: "paged",
    supports: { q: false, status: true, offset: true },
    query: { status: "status" },
    row: (r) => ({
      id: r.request_ref,
      subject: r.subject_id,
      subjectType: labelize(r.subject_type),
      type: labelize(r.request_type),
      status: labelize(r.status),
      note: r.resolution_note,
      raisedOn: dateParts(r.created_at).date,
      completedOn: dateParts(r.completed_at).date,
      iso: dateParts(r.created_at).iso,
      raw: r,
    }),
  },

  // Banners, FAQs, notices and help articles rendered by the merchant app.
  appContent: {
    path: "/api/super-admin/v1/content",
    createsAs: "appContent",
    // PATCH /{content_ref} and DELETE /{content_ref} both exist, so an existing item is editable
    // and removable rather than append-only.
    editable: true,
    deletable: true,
    forEdit: contentForEdit,
    shape: "paged",
    supports: { q: true, status: true, offset: true },
    query: { kind: "kind", status: "status", audience: "audience", placement: "placement" },
    tabField: "kind",
    row: (c) => ({
      id: c.content_ref,
      title: c.title,
      kind: labelize(c.kind),
      subtitle: c.subtitle,
      category: c.category || "",
      placement: labelize(c.placement),
      deepLink: deepLinkLabel(c.deep_link),
      audience: labelize(c.audience),
      featured: c.is_featured ? "Yes" : "No",
      sort: c.sort_order,
      impressions: c.impression_count,
      clicks: c.click_count,
      startsOn: dateParts(c.starts_at).date,
      endsOn: dateParts(c.ends_at).date,
      status: labelize(c.status),
      serving: contentServing(c),
      publishedOn: dateParts(c.published_at).dateTime,
      iso: dateParts(c.created_at).iso,
      raw: c,
    }),
  },

  // Merchant in-app inbox broadcasts, administered separately from the delivery log.
  merchantInbox: {
    path: "/api/super-admin/v1/content/notifications",
    createsAs: "merchantNotification",
    shape: "paged",
    supports: { q: false, status: false, offset: true },
    query: { category: "category", merchant: "merchant_code" },
    tabField: "category",
    row: (n) => ({
      id: n.notification_ref,
      title: n.title,
      body: n.body,
      category: labelize(n.category),
      deepLink: deepLinkLabel(n.deep_link),
      audience: labelize(n.audience),
      // The notification row stores a numeric merchant id. The list joins the code and trade name
      // so the operator can read who was addressed; until an API that carries them is deployed
      // this says "id 12" instead of pretending to know the name.
      merchant:
        n.merchant_id == null
          ? "All merchants"
          : n.merchant_code
            ? `${n.merchant_name || "Merchant"} (${n.merchant_code})`
            : `Merchant id ${n.merchant_id}`,
      createdBy: n.created_by,
      createdOn: dateParts(n.created_at).dateTime,
      iso: dateParts(n.created_at).iso,
      raw: n,
    }),
  },

  c_loans: {
    path: "/api/collection-admin/v1/loans",
    fixedQuery: { book: "accounts" },
    // The facade exposes the loan book read-only; approving or disbursing a loan stays on the
    // feature route, so a new loan is still posted where the transition lives.
    createPath: "/api/loans/v1/loans",
    createsAs: "loans",
    shape: "paged",
    supports: { q: true, status: true, offset: true },
    query: { status: "status", borrower: "borrower_user_id", merchant: "merchant_code" },
    row: (l) => ({
      id: l.loan_ref,
      loan_ref: l.loan_ref,
      borrower: l.borrower_name,
      mobile: l.borrower_phone,
      email: l.borrower_email,
      product: l.product_name || l.product_code || l.product_id,
      principal: rupees(l.principal_paise),
      emi: rupees(l.emi_paise),
      outstanding: rupees(l.outstanding_principal_paise),
      totalInterest: rupees(l.total_interest_paise),
      totalPayable: rupees(l.total_payable_paise),
      disbursed: rupees(l.disbursed_paise),
      rate: l.annual_interest_rate_bps / 100,
      tenure: l.tenure_months,
      status: labelize(l.status),
      kycStatus: l.kyc_status ? labelize(l.kyc_status) : "Not Started",
      nextDue: dateParts(l.next_due_date).date,
      disbursementMethod: l.disbursement_method ? labelize(l.disbursement_method) : "",
      disbursementReference: l.disbursement_reference || "",
      disbursedOn: dateParts(l.disbursed_at).dateTime,
      rejectionReason: l.rejection_reason || "",
      ...(l.application_details ? {
        customerReference: l.application_details.external_customer_id,
        externalLoanReference: l.application_details.external_loan_id,
        borrowerAddress: l.application_details.borrower_address || "",
        panMasked: l.application_details.pan_masked || "",
        aadhaarMasked: l.application_details.aadhaar_masked || "",
        firstEmiDate: l.application_details.first_due_date,
        kycReference: l.application_details.kyc_reference || "Not supplied",
        // The reviewing officer opens each file through a presigned link; the row only carries
        // the metadata and the per-document KYC decision the backend recorded.
        documents: (l.application_details.documents || []).map((d) => ({
          docType: d.doc_type,
          storageKey: d.storage_key,
          fileName: d.file_name,
          contentType: d.content_type,
          status: d.status || "uploaded",
          verification: d.verification || null,
        })),
        collectionRequest: l.application_details.collection ? "Requested — not authorized" : "Set up later",
        ...(l.application_details.collection ? {
          collectionRail: l.application_details.collection.rail === "upi" ? "UPI AutoPay" : "NACH / e-NACH",
          collectionAmountType: labelize(l.application_details.collection.amount_type),
          collectionAmount: `₹${rupees(l.application_details.collection.amount_paise).toLocaleString("en-IN")}`,
          collectionFrequency: "Monthly",
          collectionStart: l.application_details.collection.start_date,
          collectionEnd: l.application_details.collection.end_date,
          consentReference: l.application_details.collection.consent_reference,
        } : {}),
        detailsConfirmed: l.application_details.details_confirmed ? "Yes" : "No",
        submittedOn: dateParts(l.application_details.recorded_at).iso,
      } : {}),
      iso: dateParts(l.created_at).iso,
      raw: l,
    }),
  },

  c_cases: {
    path: "/api/collection-admin/v1/accounts",
    shape: "paged",
    supports: { q: true, status: true, offset: true },
    query: { status: "status", bucket: "bucket", agent: "assigned_agent_id", branch: "branch_code" },
    row: (a) => ({
      id: a.account_ref,
      account_ref: a.account_ref,
      loanId: a.loan_id,
      borrower: a.borrower_name,
      mobile: a.borrower_phone,
      outstanding: rupees(a.outstanding_paise),
      dpd: a.dpd,
      bucket: a.bucket,
      status: labelize(a.status),
      agent: a.assigned_agent_id,
      branch: a.branch_id,
      lastContacted: dateParts(a.last_contacted_at).date,
      nextFollowUp: dateParts(a.next_follow_up_date).date,
      nextFollowUpIso: dateParts(a.next_follow_up_date).iso,
      iso: dateParts(a.created_at).iso,
      raw: a,
    }),
  },

  c_agents: {
    path: "/api/identity/v1/users",
    createsAs: "agent",
    shape: "paged",
    supports: { q: true, status: true, offset: true },
    fixedQuery: { role: "COLLECTION_AGENT" },
    query: { status: "status" },
    row: (u) => ({
      id: String(u.id),
      name: u.full_name || u.email,
      email: u.email,
      mobile: u.phone,
      status: labelize(u.status),
      branch: u.branch ? u.branch.name : u.branch_code,
      region: u.region,
      lastLogin: dateParts(u.last_login_at).dateTime,
      iso: dateParts(u.created_at).iso,
      raw: u,
    }),
  },

  refunds: {
    path: "/api/payments/v1/refunds",
    shape: "paged",
    supports: { q: true, status: true, offset: true },
    query: { status: "status", merchant: "merchant_code" },
    row: (r) => ({
      id: r.merchant_refund_id,
      order: r.order_id,
      dateTime: dateParts(r.created_at).dateTime,
      date: dateParts(r.created_at).date,
      merchant: r.merchant_code,
      provider: r.provider,
      type: labelize(r.refund_type),
      amount: rupees(r.amount_paise),
      rrn: r.rrn,
      responseCode: r.response_code,
      responseDescription: r.response_description,
      status: labelize(r.status),
      completedOn: dateParts(r.completed_at).date,
      iso: dateParts(r.created_at).iso,
      raw: r,
    }),
  },

  // A reconciliation run is one ingest-and-match pass over a provider settlement file.
  // POST /reports/ingest fetches one provider day (rate-limited by the provider); the row is
  // the resulting run, so the ordinary create form starts a run instead of writing a row.
  recon: {
    path: "/api/settlement/v1/reconciliation",
    createPath: "/api/settlement/v1/reports/ingest",
    createsAs: "recon",
    shape: "paged",
    supports: { q: true, status: true, offset: true },
    query: { status: "status", partner: "provider", date: "utr_date" },
    row: (r) => ({
      id: String(r.id),
      file: r.file_name,
      partner: r.provider,
      lender: r.provider,
      date: dateParts(r.utr_date).date,
      total: r.rows_fetched,
      matched: r.matched,
      unmatched: r.mismatched,
      status: labelize(r.status),
      error: r.error,
      startedOn: dateParts(r.started_at).dateTime,
      finishedOn: dateParts(r.finished_at).dateTime,
      iso: dateParts(r.utr_date || r.started_at).iso,
      raw: r,
    }),
  },

  categories: {
    path: "/api/merchants/v1/categories",
    createsAs: "categories",
    shape: "paged",
    supports: { q: true, status: true, offset: true },
    query: { status: "status" },
    editable: true,
    deletable: true,
    row: (c) => ({
      id: c.category_code,
      code: c.category_code,
      name: c.name,
      merchants: c.merchant_count,
      share: percent(c.share_bps),
      mdr: percent(c.mdr_bps),
      status: labelize(c.status),
      iso: dateParts(c.created_at).iso,
      raw: c,
    }),
    // PATCH accepts name, MDR and status; the code is the path key and cannot be renamed.
    // The table shows "1.50%", but the form needs the number 1.5 to round-trip it.
    forEdit: (row) => {
      const c = row.raw || {};
      return {
        name: c.name,
        mdr: Number(c.mdr_bps || 0) / 100,
        status: labelize(c.status),
      };
    },
  },

  groups: {
    path: "/api/merchants/v1/groups",
    createsAs: "groups",
    shape: "paged",
    supports: { q: true, status: true, offset: true },
    query: { status: "status" },
    row: (g) => ({
      id: g.group_code,
      code: g.group_code,
      name: g.name,
      members: g.member_count,
      settlementCycle: labelize(g.settlement_cycle),
      owner: g.owner_merchant_code,
      status: labelize(g.status),
      iso: dateParts(g.created_at).iso,
      raw: g,
    }),
  },

  // Static and dynamic QR rows come back from one endpoint, discriminated by qr_type.
  qrs: {
    path: "/api/qr/v1",
    // A static QR is issued per merchant by the backend; this is the only create route, and it
    // issues a dynamic QR for a merchant with an optional amount and expiry.
    createPath: "/api/qr/v1/dynamic",
    createsAs: "qrs",
    shape: "paged",
    supports: { q: true, status: true, offset: true },
    query: { status: "status", type: "qr_type", merchant: "merchant_code" },
    row: (q) => ({
      id: q.id,
      type: labelize(q.qr_type),
      merchant: q.merchant_code,
      amount: rupees(q.amount_paise),
      payload: q.payload,
      image: q.image_url,
      scans: q.scans,
      createdOn: dateParts(q.created_at).date,
      expiresOn: dateParts(q.expires_at).date,
      usedOn: dateParts(q.used_at).dateTime,
      status: labelize(q.status),
      iso: dateParts(q.created_at).iso,
      raw: q,
    }),
  },

  // Generated CSVs: the row is the report record, the file lives in object storage and is
  // streamed back through downloadPath.
  reportFiles: {
    path: "/api/reports/v1",
    createsAs: "reports",
    shape: "paged",
    editable: false,
    deletable: true,
    supports: { q: true, status: true, offset: true },
    query: { status: "status", type: "report_type" },
    row: (r) => ({
      id: r.report_ref,
      name: r.name,
      type: labelize(r.report_type),
      range: r.date_from || r.date_to
        ? `${dateParts(r.date_from).date} - ${dateParts(r.date_to).date}`
        : "All time",
      rows: r.rows,
      size: kb(r.size_bytes),
      generated: dateParts(r.generated_at).dateTime,
      status: labelize(r.status),
      error: r.error,
      generatedBy: r.generated_by,
      downloadPath: r.download_path,
      iso: dateParts(r.created_at).iso,
      raw: r,
    }),
  },

  // Each dashboard sees only its own scope; see settingsResource above.
  settings: settingsResource("merchant"),
  c_settings: settingsResource("collection"),
  sa_config: settingsResource("system"),

  // Borrowers are rolled up from the loans table, so there is no city, risk band or profile
  // status on the row - only loan counts, outstanding and the next due date.
  c_borrowers: {
    path: "/api/collection-admin/v1/borrowers",
    shape: "paged",
    supports: { q: true, status: true, offset: true },
    query: { q: "q", status: "status" },
    row: (b) => ({
      id: b.id,
      name: b.name,
      mobile: b.mobile,
      email: b.email,
      loans: b.loans,
      outstanding: rupees(b.outstanding_paise),
      active: Boolean(b.active),
      nextDue: dateParts(b.next_due_date).date,
      status: b.active ? "Active" : "Inactive",
      createdOn: dateParts(b.created_at).date,
      iso: dateParts(b.created_at).iso,
      raw: b,
    }),
  },

  // KYC profiles cover every entity, so the collection screen shows the subject type and lets
  // the operator filter on it rather than pretending every row is a borrower.
  c_kyc: {
    path: "/api/kyc/v1/profiles",
    shape: "paged",
    supports: { q: true, status: true, offset: true },
    query: { status: "status", type: "entity_type" },
    row: (k) => ({
      id: String(k.id),
      subject: k.entity_name || k.entity_code || `${labelize(k.entity_type)} ${k.entity_id}`,
      type: labelize(k.entity_type),
      code: k.entity_code,
      pan: k.pan,
      panCheck: verdict(k.pan_verified),
      aadhaar: verdict(k.aadhaar_verified),
      ckyc: k.ckyc_number,
      ckycCheck: verdict(k.ckyc_verified),
      bank: k.bank_ifsc,
      bankCheck: verdict(k.bank_verified),
      provider: k.provider,
      status: labelize(k.status),
      updatedOn: dateParts(k.updated_at).dateTime,
      iso: dateParts(k.created_at).iso,
      raw: k,
    }),
  },

  c_emi: {
    path: "/api/collection-admin/v1/installments",
    shape: "paged",
    supports: { q: true, status: true, offset: true },
    query: { status: "status", dueDate: "due_from" },
    row: (i) => ({
      id: String(i.id),
      borrower: i.borrower_name,
      mobile: i.borrower_phone,
      loan: i.loan_ref,
      number: i.installment_number,
      emi: rupees(i.total_paise),
      principal: rupees(i.principal_paise),
      interest: rupees(i.interest_paise),
      paid: rupees(i.paid_paise),
      dueDate: dateParts(i.due_date).date,
      paidOn: dateParts(i.paid_at).date,
      status: labelize(i.status),
      iso: dateParts(i.due_date).iso,
      // The collection account behind the loan, so the dashboard's EMI Due
      // Today card can offer Collect directly (D10). Empty when the loan has
      // no account yet, which keeps the "Open account" fallback honest.
      account: i.account_ref || "",
      raw: i,
    }),
  },

  c_followups: {
    path: "/api/collection-admin/v1/tasks",
    createsAs: "followups",
    shape: "paged",
    supports: { q: true, status: true, offset: true },
    query: { status: "status", type: "task_type", agent: "assigned_agent_id" },
    row: (t) => ({
      id: String(t.id),
      account: t.account_ref,
      borrower: t.borrower_name,
      mobile: t.borrower_phone,
      loan: t.loan_ref,
      agent: t.assigned_agent_name || t.assigned_agent_id,
      type: labelize(t.task_type),
      nextDate: dateParts(t.due_date).date,
      notes: t.notes,
      completedOn: dateParts(t.completed_at).dateTime,
      status: labelize(t.status),
      iso: dateParts(t.due_date || t.created_at).iso,
      raw: t,
    }),
  },

  c_promises: {
    path: "/api/collection-admin/v1/promises",
    createsAs: "promises",
    shape: "paged",
    supports: { q: true, status: true, offset: true },
    query: { status: "status", promiseDate: "due_from" },
    row: (p) => ({
      id: String(p.id),
      account: p.account_ref,
      borrower: p.borrower_name,
      loan: p.loan_ref,
      amount: rupees(p.promised_amount_paise),
      promiseDate: dateParts(p.promised_date).date,
      agent: p.agent_name || p.agent_id,
      notes: p.notes,
      status: labelize(p.status),
      createdOn: dateParts(p.created_at).date,
      resolvedOn: dateParts(p.resolved_at).date,
      iso: dateParts(p.promised_date).iso,
      raw: p,
    }),
  },

  // Recorded receipts are successful collections by definition; the backend keeps no failed
  // receipt rows, so the failed-payment screen has no source (see UNMAPPED.c_failedPayments).
  c_payments: {
    path: "/api/collection-admin/v1/receipts",
    createsAs: "receipts",
    shape: "paged",
    supports: { q: true, status: false, offset: true },
    query: { method: "channel" },
    row: (r) => ({
      id: String(r.id),
      account: r.account_ref,
      borrower: r.borrower_name,
      loan: r.loan_ref,
      amount: rupees(r.amount_paise),
      method: labelize(r.channel),
      collectedBy: r.collected_by_name,
      receiptNo: r.reference,
      dateTime: dateParts(r.collected_at).dateTime,
      iso: dateParts(r.collected_at).iso,
      raw: r,
    }),
  },

  // Declined EMI debits. These are payment attempts raised from a loan-linked payment
  // link, so the row is a payment, not a collection receipt - the account is not touched.
  c_failedPayments: {
    path: "/api/collection-admin/v1/failed-payments",
    shape: "paged",
    supports: { q: true, status: true, offset: true },
    query: { method: "payment_mode", status: "status" },
    row: (r) => ({
      id: r.order_id,
      borrower: r.borrower_name || r.buyer_phone,
      loan: r.loan_ref,
      link: r.link_ref,
      amount: rupees(r.amount_paise),
      method: r.payment_mode,
      status: labelize(r.status),
      response: r.response_description,
      responseCode: r.response_code,
      dateTime: dateParts(r.created_at).dateTime,
      attemptedOn: dateParts(r.completed_at || r.created_at).dateTime,
      iso: dateParts(r.created_at).iso,
      raw: r,
    }),
  },

  c_aging: {
    path: "/api/collection-admin/v1/aging",
    // One row per DPD bucket, aggregated by the backend; there is no paging and no date on a
    // bucket, so the global date-range filter is skipped for this table.
    shape: "array",
    supports: { q: false, status: false, offset: false },
    fetchLimit: 200,
    row: (a) => ({
      id: a.bucket,
      bucket: a.bucket,
      accounts: a.accounts,
      amount: rupees(a.outstanding_paise),
      share: percent(a.share_bps),
      status: labelize(a.status),
      raw: a,
    }),
  },

  c_assign: {
    path: "/api/collection-admin/v1/assignments",
    shape: "paged",
    supports: { q: true, status: true, offset: true },
    query: { bucket: "bucket", agent: "assigned_agent_id" },
    row: (a) => ({
      id: a.id,
      agent: a.agent_name || a.agent_id,
      area: a.area,
      accounts: a.accounts,
      bucket: a.bucket,
      outstanding: rupees(a.outstanding_paise),
      assignedOn: dateParts(a.assigned_on).date,
      status: labelize(a.status),
      iso: dateParts(a.assigned_on).iso,
      raw: a,
    }),
  },
};

RESOURCES.c_applications = { ...RESOURCES.c_loans, fixedQuery: { book: "applications" } };
RESOURCES.c_disb = { ...RESOURCES.c_loans, only: (row) => row.disbursed > 0 };
// Overdue is derived: an account is overdue once days-past-due turns positive.
RESOURCES.c_overdue = {
  ...RESOURCES.c_cases,
  only: (r) => (Number(r.dpd) || 0) > 0,
};
// Support tickets and notification logs are platform-wide lists; the collection screens show
// the same rows and filter them locally.
RESOURCES.c_tickets = { ...RESOURCES.tickets };
RESOURCES.c_notifications = { ...RESOURCES.notifications };
// Settlement, collection and loan reports are one table filtered by report_type.
RESOURCES.c_reportFiles = { ...RESOURCES.reportFiles };
RESOURCES.c_recon = { ...RESOURCES.recon };

// Page keys whose data still has no backing endpoint. Listing them explicitly means the UI
// reports "no endpoint yet" instead of showing invented numbers.
export const UNMAPPED = {};
