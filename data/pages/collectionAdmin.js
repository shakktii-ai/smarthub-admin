// Page configs for Collection Admin. Key = route path under /collection-admin/.
import { countBy, countWhere, modeOf, monthStart, plain, rupee, sumBy } from "@/lib/stats";
import { settingsCreate } from "@/data/settingsForm";

const cols = (...s) =>
  s.map((x) => {
    const [key, label, type] = x.split(":");
    return { key, label, ...(type ? { type } : {}) };
  });
const sel = (name, label, options) => ({
  name,
  label,
  type: "select",
  options,
  required: true,
});
const txt = (name, label) => ({ name, label, required: true });
const num = (name, label) => ({
  name,
  label,
  required: true,
  type: "number",
  min: 1,
  pattern: /^[1-9]\d{0,9}$/,
  message: "Enter a positive number",
});
// Interest is stored in basis points, so a percent field must accept fractions like 12.50.
const pct = (name, label) => ({
  name,
  label,
  required: true,
  type: "number",
  min: 0,
  max: 100,
  step: "0.01",
  pattern: /^\d{1,3}(\.\d{1,2})?$/,
  message: "Enter a percent, e.g. 12.50",
});
const email = { name: "email", label: "Email", type: "email" };
const mob = {
  name: "mobile",
  label: "Mobile",
  required: true,
  type: "tel",
  pattern: /^[6-9]\d{9}$/,
  message: "Enter 10 digits starting 6-9",
};
const set = (label, setStatus, when, danger, confirm) => ({
  label,
  confirm:
    confirm || "This writes to the backend and cannot be undone from the dashboard.",
  setStatus,
  when,
  danger,
});
// Loan and collection transitions are separate routes, so an action names the verb it calls.
const verb = (label, verbName, when, danger, confirm) => ({
  label,
  verb: verbName,
  confirm: confirm || "This writes to the backend and cannot be undone from the dashboard.",
  when,
  danger,
});

export const PAGES = {
  "loans/applications": {
    title: "Loan Applications",
    subtitle: "Review and decide on incoming loan applications.",
    resource: "c_applications",
    // Clicking a row opens the full review screen: masked identity, uploaded documents, manual
    // KYC, approval and the cash/bank disbursement choice all live there, not in a generic drawer.
    detailHref: (r) => `/collection-admin/loans/applications/${r.id}`,
    tabField: "status",
    filters: ["product", "borrower"],
    columns: cols(
      "id:Application",
      "borrower:Applicant",
      "mobile:Mobile",
      "product:Product",
      "principal:Amount:money",
      "tenure:Tenure (mo)",
      "rate:Rate %",
      "kycStatus:KYC",
      "status:Status",
    ),
    statsFor: (d) => [
      ["Applications", plain(d.all)],
      ["Requested", rupee(sumBy(d, "principal"))],
      ["New this month", plain(countWhere(d, (r) => r.iso >= monthStart()))],
      ["Distinct Products", plain(new Set(d.allRows.map((r) => r.product)).size)],
    ],
  },
  "loans/accounts": {
    title: "Loan Accounts",
    subtitle: "Funded and closed loans with outstanding balances, EMI and delinquency. New requests belong in Loan Applications.",
    resource: "c_loans",
    tabField: "status",
    filters: ["product", "borrower"],
    columns: cols(
      "id:Loan ID",
      "borrower:Borrower",
      "product:Product",
      "principal:Principal:money",
      "outstanding:Outstanding:money",
      "emi:EMI:money",
      "nextDue:Next Due",
      "status:Status",
    ),
    statsFor: (d) => [
      ["Total Loans", plain(d.all)],
      ["Active", plain(countBy(d, "Active"))],
      ["Outstanding", rupee(sumBy(d, "outstanding"))],
      ["NPA / Defaulted", plain(countBy(d, "NPA", "Defaulted"))],
    ],
    actions: [
      verb(
        "Close account",
        "close",
        (r) => ["Active", "Disbursed", "Approved"].includes(r.status),
        true,
        "Closes the loan account on the backend.",
      ),
    ],
  },
  "loans/disbursements": {
    title: "Disbursements",
    subtitle: "Loan amounts released to borrowers.",
    resource: "c_disb",
    tabField: "status",
    filters: ["product", "borrower"],
    columns: cols(
      "id:Loan ID",
      "borrower:Borrower",
      "product:Product",
      "disbursed:Disbursed:money",
      "principal:Principal:money",
      "nextDue:Next Due",
      "status:Status",
    ),
    statsFor: (d) => [
      ["Disbursed Loans", plain(d.all)],
      ["Disbursed Amount", rupee(sumBy(d, "disbursed"))],
      ["Outstanding", rupee(sumBy(d, "outstanding"))],
      ["This Month", plain(countWhere(d, (r) => r.iso >= monthStart()))],
    ],
    actions: [
      {
        label: "Disburse",
        verb: "disburse",
        when: (r) => r.status === "Approved",
        form: [
          { name: "method", label: "Method", type: "select", options: ["cash", "bank_transfer"], required: true },
          { name: "reference", label: "Reference (UTR / cheque no.)" },
        ],
        confirm: "Releases the loan amount to the borrower. This cannot be undone from the dashboard.",
      },
    ],
  },
  borrowers: {
    title: "All Borrowers",
    subtitle: "Borrowers rolled up from their loans (GET /api/collection-admin/v1/borrowers).",
    resource: "c_borrowers",
    tabField: "status",
    columns: cols(
      "id:Borrower ID",
      "name:Name",
      "mobile:Mobile",
      "email:Email",
      "loans:Loans",
      "outstanding:Outstanding:money",
      "nextDue:Next Due",
      "status:Status",
    ),
  },
  "borrowers/kyc": {
    title: "KYC & Documents",
    subtitle: "Verification profiles for every entity on the platform.",
    resource: "c_kyc",
    tabField: "status",
    filters: ["type"],
    columns: cols(
      "id:KYC ID",
      "subject:Subject",
      "type:Entity",
      "pan:PAN",
      "aadhaar:Aadhaar",
      "ckyc:CKYC",
      "bank:Bank",
      "status:Status",
    ),
  },
  "emi/schedule": {
    title: "EMI Schedule",
    subtitle: "All EMIs by due date and status.",
    resource: "c_emi",
    tabField: "status",
    filters: ["loan"],
    columns: cols(
      "id:EMI ID",
      "borrower:Borrower",
      "loan:Loan ID",
      "number:#",
      "emi:EMI Amount:money",
      "dueDate:Due Date",
      "status:Status",
    ),
    // Inline receipt recording (D13): rows carry the collection account ref
    // backend-side, so a due EMI can be collected without leaving the screen.
    actions: [
      {
        label: "Collect",
        verb: "collect",
        when: (r) => r.status !== "Paid",
        form: [
          {
            name: "amount",
            label: "Amount (₹) — blank collects this EMI's unpaid balance",
            type: "number",
            min: 1,
            step: "0.01",
          },
          sel("method", "Channel", ["Cash", "UPI", "Bank Transfer"]),
          { name: "reference", label: "Reference (UTR / receipt no.)" },
        ],
        confirm:
          "Records a receipt against this loan's collection account. This records money already received — it does not charge the borrower.",
      },
    ],
  },
  "emi/upcoming": {
    title: "Upcoming EMI",
    subtitle: "Installments booked and not yet paid.",
    resource: "c_emi",
    base: { status: "Pending" },
    columns: cols(
      "id:EMI ID",
      "borrower:Borrower",
      "loan:Loan ID",
      "emi:EMI Amount:money",
      "dueDate:Due Date",
      "status:Status",
    ),
    actions: [
      {
        label: "Collect",
        verb: "collect",
        when: (r) => r.status !== "Paid",
        form: [
          {
            name: "amount",
            label: "Amount (₹) — blank collects this EMI's unpaid balance",
            type: "number",
            min: 1,
            step: "0.01",
          },
          sel("method", "Channel", ["Cash", "UPI", "Bank Transfer"]),
          { name: "reference", label: "Reference (UTR / receipt no.)" },
        ],
        confirm:
          "Records a receipt against this loan's collection account. This records money already received — it does not charge the borrower.",
      },
    ],
  },
  collections: {
    title: "Collection Overview",
    subtitle: "Open collection accounts by bucket and agent.",
    resource: "c_cases",
    tabField: "status",
    filters: ["bucket", "agent", "branch"],
    columns: cols(
      "id:Account",
      "borrower:Borrower",
      "loanId:Loan ID",
      "bucket:Bucket",
      "dpd:DPD",
      "outstanding:Outstanding:money",
      "agent:Agent",
      "lastContacted:Last Contact",
      "nextFollowUp:Next Follow-up",
      "status:Status",
    ),
    statsFor: (d) => [
      ["Accounts", plain(d.all)],
      ["Outstanding", rupee(sumBy(d, "outstanding"))],
      ["Active", plain(countBy(d, "Active"))],
      ["Paused / Closed", plain(countBy(d, "Paused", "Closed"))],
    ],
    actions: [
      set(
        "Pause collection",
        "Paused",
        (r) => r.status === "Active",
        true,
        "Sets the collection account to Paused on the backend.",
      ),
      set(
        "Resume collection",
        "Active",
        (r) => r.status === "Paused",
        false,
        "Sets the collection account back to Active on the backend.",
      ),
      set(
        "Close account",
        "Closed",
        (r) => r.status !== "Closed",
        true,
        "Closes the collection account. This cannot be undone from the dashboard.",
      ),
    ],
  },
  "collections/followups": {
    title: "Follow-ups",
    subtitle: "Calls, visits and reminders booked against collection accounts.",
    resource: "c_followups",
    tabField: "status",
    filters: ["type", "agent"],
    columns: cols(
      "id:ID",
      "account:Account",
      "borrower:Borrower",
      "loan:Loan ID",
      "agent:Agent",
      "type:Type",
      "nextDate:Next Date",
      "status:Status",
    ),
    create: {
      label: "Add Follow-up",
      form: [
        txt("account", "Account ref"),
        sel("type", "Type", ["Call", "Visit", "Reminder", "Follow Up"]),
        { name: "nextDate", label: "Next date", type: "date" },
        { name: "notes", label: "Notes" },
      ],
    },
    actions: [
      set(
        "Mark completed",
        "Completed",
        (r) => r.status !== "Completed",
        false,
        "POST /api/collection-admin/v1/tasks/{id}/complete closes the task for every other status.",
      ),
    ],
  },
  "collections/promises": {
    title: "Promise to Pay",
    subtitle: "Borrower payment commitments and whether they were kept.",
    resource: "c_promises",
    tabField: "status",
    filters: ["agent"],
    columns: cols(
      "id:ID",
      "account:Account",
      "borrower:Borrower",
      "loan:Loan ID",
      "amount:Amount:money",
      "promiseDate:Promise Date",
      "agent:Agent",
      "status:Status",
    ),
    create: {
      label: "Add Promise to Pay",
      form: [
        txt("account", "Account ref"),
        num("amount", "Amount (₹)"),
        { name: "promiseDate", label: "Promise date", type: "date", required: true },
        { name: "notes", label: "Notes" },
      ],
      numeric: ["amount"],
    },
    actions: [
      set("Mark kept", "Kept", (r) => r.status === "Open"),
      set("Mark broken", "Broken", (r) => r.status === "Open", true),
    ],
  },
  payments: {
    title: "Payments & Receipts",
    subtitle: "Collections recorded against borrower accounts.",
    resource: "c_payments",
    filters: ["method"],
    columns: cols(
      "dateTime:Date & Time",
      "account:Account",
      "borrower:Borrower",
      "loan:Loan ID",
      "amount:Amount:money",
      "method:Method",
      "collectedBy:Collected By",
      "receiptNo:Reference",
    ),
    create: {
      label: "Record Payment",
      form: [
        txt("account", "Account ref"),
        num("amount", "Amount (₹)"),
        sel("method", "Method", ["Cash", "UPI", "NEFT", "RTGS", "Cheque"]),
        { name: "reference", label: "Reference" },
      ],
      numeric: ["amount"],
    },
  },
  "payments/failed": {
    title: "Failed Payments",
    subtitle:
      "EMI debits the provider declined, taken from loan-linked payment links (GET /api/collection-admin/v1/failed-payments).",
    resource: "c_failedPayments",
    tabField: "status",
    filters: ["method", "loan"],
    columns: cols(
      "id:Order ID",
      "dateTime:Date & Time",
      "borrower:Borrower",
      "loan:Loan ID",
      "amount:Amount:money",
      "method:Method",
      "response:Provider Response",
      "status:Status",
    ),
    statsFor: (d) => [
      ["Declined Attempts", plain(d.all)],
      ["Failed", plain(countBy(d, "Failed"))],
      ["Cancelled", plain(countBy(d, "Cancelled"))],
      ["Amount Not Collected", rupee(sumBy(d, "amount"))],
      ["Top Reason", modeOf(d, "response")],
    ],
  },
  overdue: {
    title: "Overdue Accounts",
    subtitle: "Accounts with days past due, from the collection account queue.",
    resource: "c_overdue",
    tabField: "bucket",
    filters: ["agent", "branch"],
    columns: cols(
      "id:Account",
      "borrower:Borrower",
      "loanId:Loan ID",
      "outstanding:Overdue Amount:money",
      "dpd:Days Past Due",
      "bucket:Risk",
      "status:Status",
    ),
    statsFor: (d) => [
      ["Overdue Accounts", plain(d.all)],
      ["Overdue Value", rupee(sumBy(d, "outstanding"))],
      ["Avg DPD", plain(Math.round(sumBy(d, "dpd") / (d.all || 1)))],
      ["Highest Bucket", modeOf(d, "bucket")],
    ],
    // Mirror the pause/resume/close verbs from the collection overview (D14):
    // the same account-status PATCH route serves both lists.
    actions: [
      set("Pause collection", "Paused", (r) => r.status === "Active", true, "Sets the collection account to Paused on the backend."),
      set("Resume collection", "Active", (r) => r.status === "Paused", false, "Sets the collection account back to Active on the backend."),
      set("Close account", "Closed", (r) => r.status !== "Closed", true, "Closes the collection account. This cannot be undone from the dashboard."),
    ],
  },
  "overdue/aging": {
    title: "Aging & Delinquency",
    subtitle: "Overdue amount by days-past-due bucket (GET /api/collection-admin/v1/aging).",
    resource: "c_aging",
    columns: cols(
      "bucket:Bucket",
      "accounts:Accounts",
      "amount:Overdue Amount:money",
      "share:Share",
      "status:Status",
    ),
    statsFor: (d) => [
      ["Buckets", plain(d.all)],
      ["Accounts", plain(sumBy(d, "accounts"))],
      ["Overdue Value", rupee(sumBy(d, "amount"))],
    ],
  },
  agents: {
    title: "Collection Agents",
    subtitle: "Field and tele-collection agents.",
    resource: "c_agents",
    tabField: "status",
    filters: ["branch", "region"],
    columns: cols(
      "id:Agent ID",
      "name:Name",
      "email:Email",
      "mobile:Mobile",
      "branch:Branch",
      "region:Region",
      "status:Status",
    ),
    statsFor: (d) => [
      ["Agents", plain(d.all)],
      ["Active", plain(countBy(d, "Active"))],
      ["Suspended", plain(countBy(d, "Suspended"))],
      ["Never Signed In", plain(countWhere(d, (r) => !r.lastLogin))],
    ],
    // Suspend/activate reuse the identity user status route (D14).
    actions: [
      { label: "Suspend", setStatus: "Suspended", when: (r) => r.status !== "Suspended" },
      { label: "Activate", setStatus: "Active", when: (r) => r.status === "Suspended" },
    ],
    create: {
      label: "Add Agent",
      idPrefix: "AG-",
      form: [
        txt("name", "Full name"),
        { name: "email", label: "Email", required: true, type: "email" },
        {
          name: "password",
          label: "Temporary password",
          required: true,
          type: "password",
          autoComplete: "new-password",
          pattern: /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{10,}$/,
          message: "At least 10 characters with an uppercase, a lowercase and a digit",
        },
        mob,
        txt("branch", "Branch code"),
        { name: "region", label: "Region" },
      ],
      numeric: [],
    },
  },
  "agents/assignments": {
    title: "Assignments",
    subtitle: "Portfolio allocation by agent and area.",
    resource: "c_assign",
    tabField: "status",
    filters: ["bucket", "agent"],
    columns: cols(
      "id:ID",
      "agent:Agent",
      "area:Area",
      "accounts:Accounts",
      "bucket:Bucket",
      "assignedOn:Assigned On",
      "status:Status",
    ),
  },
  "agents/performance": {
    title: "Agent Activity",
    subtitle: "Sign-in activity for collection agents.",
    resource: "c_agents",
    tabField: "status",
    filters: ["branch", "region"],
    columns: cols(
      "id:Agent ID",
      "name:Agent",
      "branch:Branch",
      "region:Region",
      "lastLogin:Last Login",
      "status:Status",
    ),
    statsFor: (d) => [
      ["Agents", plain(d.all)],
      ["Signed In Recently", plain(countWhere(d, (r) => Boolean(r.lastLogin)))],
      ["Active", plain(countBy(d, "Active"))],
      ["Suspended", plain(countBy(d, "Suspended"))],
    ],
  },
  "reports/collection": {
    title: "Collection Reports",
    subtitle: "Download collection reports.",
    resource: "c_reportFiles",
    base: { type: "Collections" },
    download: true,
    columns: cols(
      "name:Report Name",
      "type:Type",
      "range:Date Range",
      "rows:Rows",
      "size:Size",
      "generated:Generated On",
      "status:Status",
    ),
    create: {
      label: "Generate Report",
      form: [
        txt("name", "Report name"),
        sel("type", "Report", ["Collections", "Loans"]),
        { name: "from", label: "From", type: "date" },
        { name: "to", label: "To", type: "date" },
      ],
    },
  },
  "reports/loans": {
    title: "Loan Reports",
    subtitle: "Download portfolio and delinquency reports.",
    resource: "c_reportFiles",
    base: { type: "Loans" },
    download: true,
    columns: cols(
      "name:Report Name",
      "type:Type",
      "range:Date Range",
      "rows:Rows",
      "size:Size",
      "generated:Generated On",
      "status:Status",
    ),
    create: {
      label: "Generate Report",
      form: [
        txt("name", "Report name"),
        sel("type", "Report", ["Loans", "Collections"]),
        { name: "from", label: "From", type: "date" },
        { name: "to", label: "To", type: "date" },
      ],
    },
  },
  "reports/reconciliation": {
    title: "Reconciliation",
    subtitle:
      "One run ingests a provider settlement file and matches it to payments. Ingest fetches a provider day (rate-limited); Match re-runs matching on already-stored rows.",
    resource: "c_recon",
    tabField: "status",
    filters: ["lender"],
    columns: cols(
      "file:File Name",
      "lender:Lender",
      "date:File Date",
      "total:Total Records",
      "matched:Matched",
      "unmatched:Unmatched",
      "status:Status",
    ),
    // Same shape as the merchant portal's settlements/reconciliation (D12): the
    // ingest is the ordinary create against POST /reports/ingest, and Re-run
    // match posts the stored-rows match verb without a provider call.
    create: {
      label: "Ingest provider file",
      form: [
        {
          name: "date",
          label: "Provider settlement date",
          required: true,
          type: "date",
          pattern: /^\d{4}-\d{2}-\d{2}$/,
          message: "Enter the date as YYYY-MM-DD",
        },
      ],
    },
    actions: [
      {
        label: "Re-run match",
        verb: "match",
        form: [
          {
            name: "date",
            label: "Provider settlement date",
            required: true,
            type: "date",
            pattern: /^\d{4}-\d{2}-\d{2}$/,
            message: "Enter the date as YYYY-MM-DD",
          },
        ],
        confirm:
          "Re-runs matching on stored rows for this date without calling the provider (no rate limit).",
      },
    ],
  },
  support: {
    title: "Disputes & Complaints",
    subtitle: "Support tickets raised by merchants and users.",
    resource: "c_tickets",
    tabField: "status",
    filters: ["priority", "category"],
    columns: cols(
      "id:Ticket",
      "subject:Subject",
      "category:Category",
      "merchant:Merchant",
      "priority:Priority",
      "raised:Raised",
      "status:Status",
    ),
    actions: [
      set("Resolve ticket", "Resolved", (r) => r.status !== "Resolved"),
    ],
    // Adds the Thread/Reply drawer; the message routes were already wired but
    // the flag was only set on the merchant portal's support page (D11).
    thread: true,
  },
  notifications: {
    title: "Notifications",
    subtitle: "EMI, collection, reconciliation and support alerts.",
    resource: "c_notifications",
    tabField: "status",
    filters: ["channel"],
    columns: cols(
      "template:Notification",
      "channel:Channel",
      "to:Recipient",
      "sentOn:Time",
      "status:Status",
    ),
    statsFor: (d) => [
      ["Messages", plain(d.all)],
      ["Delivered", plain(countBy(d, "Delivered"))],
      ["Sent", plain(countBy(d, "Sent"))],
      ["Failed", plain(countBy(d, "Failed"))],
    ],
  },
  settings: {
    title: "Settings",
    subtitle: "Collection-scoped configuration values (GET /api/settings/v1?scope=collection).",
    resource: "c_settings",
    tabField: "status",
    columns: cols(
      "name:Setting",
      "key:Key",
      "value:Value",
      "type:Type",
      "updatedBy:Updated By",
      "status:Status",
    ),
    create: settingsCreate("collection"),
    edit: { label: "Edit setting", skip: ["key"] },
    delete: {
      label: "Delete setting",
      confirm:
        "Deletes this collection-scoped setting from the backend. Apps that read the key fall back to their default.",
    },
  },
};
