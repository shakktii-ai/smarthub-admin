// Page configs for Super Admin. Key = route path under /super-admin/.
import { countBy, countWhere, plain, rupee, sumBy } from "@/lib/stats";
import { settingsCreate } from "@/data/settingsForm";
import { DEEP_LINK_OPTIONS, EXTERNAL_DEEP_LINK } from "@/lib/deepLinks";
import {
  AUDIENCE_OPTIONS,
  KIND_OPTIONS,
  PLACEMENT_OPTIONS,
  PLACEMENT_OTHER,
} from "@/config/appContent";

const cols = (...s) =>
  s.map((x) => {
    const [key, label, type] = x.split(":");
    return { key, label, ...(type ? { type } : {}) };
  });
const set = (label, setStatus, when, danger, confirm) => ({
  label,
  confirm:
    confirm ||
    "This writes to the backend. A checker (a different user) must approve sensitive actions in production.",
  setStatus,
  when,
  danger,
});

export const PAGES = {
  ledger: {
    title: "Finance Ledger",
    subtitle: "Double-entry ledger. Debits must equal credits every day.",
    resource: "sa_ledger",
    filters: ["account", "referenceType"],
    columns: cols(
      "id:Entry",
      "postedOn:Date",
      "account:Account",
      "debit:Debit:money",
      "credit:Credit:money",
      "description:Narration",
    ),
    statsFor: (d) => {
      const debit = sumBy(d, "debit");
      const credit = sumBy(d, "credit");
      return [
        ["Entries", plain(d.all)],
        ["Total Debit", rupee(debit)],
        ["Total Credit", rupee(credit)],
        ["Balanced", Math.abs(debit - credit) < 0.005 ? "Yes" : "No"],
      ];
    },
  },
  config: {
    title: "System Configuration",
    subtitle: "Fees, cycles, limits and policy values (GET /api/settings/v1?scope=system).",
    resource: "sa_config",
    tabField: "status",
    columns: cols(
      "name:Setting",
      "key:Key",
      "value:Value",
      "type:Type",
      "updatedBy:Updated By",
      "status:Status",
    ),
    create: settingsCreate("system"),
  },
  legal: {
    title: "Privacy Requests",
    subtitle:
      "Data access, correction and erasure requests. Nothing raises them from the apps yet, so an operator logs each one here on behalf of the data subject.",
    resource: "sa_legal",
    tabField: "status",
    filters: ["type", "subjectType"],
    columns: cols(
      "id:Request",
      "type:Request Type",
      "subjectType:Subject Type",
      "subject:Subject",
      "raisedOn:Raised",
      "completedOn:Completed",
      "note:Resolution Note",
      "status:Status",
    ),
    create: {
      label: "Log Privacy Request",
      // The consent API has no public intake, so the dashboard is the receiving desk: who
      // asked, what they asked for, and a free-text record of the channel it arrived on.
      form: [
        {
          name: "subjectType",
          label: "Data subject is a",
          type: "select",
          options: ["Merchant", "User", "Borrower"],
          required: true,
        },
        {
          name: "subject",
          label: "Subject ID",
          required: true,
          pattern: /^.{1,64}$/,
          message: "Enter the identifier, up to 64 characters",
          placeholder: (v) =>
            ({
              Merchant: "MRC000001",
              User: "usr_1a2b3c",
              Borrower: "BRW000042",
            })[v.subjectType] || "As stored on the backend",
          hint: (v) =>
            ({
              Merchant: "The merchant code shown on the Merchants page.",
              User: "The app user id from Users / staff records.",
              Borrower: "The borrower reference from the Loans page.",
            })[v.subjectType],
        },
        {
          name: "requestType",
          label: "Request type",
          type: "select",
          options: ["Access", "Correction", "Erasure"],
          required: true,
          hint: "Access asks for a copy of the data, Correction to fix records, Erasure to delete them.",
        },
        {
          name: "details",
          label: "Details",
          type: "textarea",
          rows: 5,
          pattern: /^[\s\S]{0,4000}$/,
          message: "Keep the note under 4000 characters",
          placeholder:
            "Raised by email - asks for a copy of all transaction data held since Jan 2025.",
          hint: "Optional. Record how the request reached you and what the subject asked for.",
        },
      ],
    },
    statsFor: (d) => [
      ["Requests", plain(d.all)],
      ["Open", plain(countBy(d, "Received"))],
      ["In Progress", plain(countBy(d, "Processing"))],
      ["Completed", plain(countBy(d, "Completed", "Rejected"))],
    ],
    actions: [
      set(
        "Mark completed",
        "Completed",
        (r) => r.status !== "Completed" && r.status !== "Rejected",
        false,
        "Closes the privacy request on the consent API.",
      ),
      set(
        "Reject request",
        "Rejected",
        (r) => r.status !== "Completed" && r.status !== "Rejected",
        true,
        "Rejects the privacy request on the consent API.",
      ),
    ],
  },
  "app-content": {
    title: "App Content",
    subtitle:
      "Banners, notices, FAQs and help articles. Audience decides which app serves an item (Merchant / Collection / All); only published, in-window items reach the app — an expired one shows as Expired below.",
    resource: "appContent",
    tabField: "kind",
    filters: ["status", "audience", "placement"],
    columns: cols(
      "id:Ref",
      "title:Title",
      "kind:Kind",
      "placement:Placement",
      "deepLink:Opens On Tap",
      "audience:Audience",
      "featured:Featured",
      "sort:Sort",
      "impressions:Impressions",
      "clicks:Clicks",
      "status:Status",
      "serving:Served To App",
      "publishedOn:Published",
    ),
    statsFor: (d) => [
      ["Items", plain(d.all)],
      ["Live now", plain(countWhere(d, (r) => r.serving === "Live now"))],
      ["Expired", plain(countWhere(d, (r) => r.serving === "Expired"))],
      ["Banners", plain(countBy(d, "Banner"))],
    ],
    // The create form doubles as the edit form: the same boxes, filled from the row's own backend
    // values by the seam. `skip` keeps Status out of the edit copy because publish and archive are
    // transition routes with their own buttons below, not a column the PATCH accepts - a box here
    // would be a second, quieter way to do the same thing and it would not save.
    edit: {
      label: "Edit App Content",
      skip: ["status"],
    },
    delete: {
      label: "Delete",
      confirm:
        "DELETE /api/super-admin/v1/content/{content_ref} removes the row and its click history. A published item stops serving immediately. To hide an item but keep the record, use Archive instead.",
    },
    create: {
      label: "Add App Content",
      initial: { kind: "Banner", status: "Draft" },
      // The merchant app reads a different subset of columns per kind, so the form shows only the
      // fields the selected kind renders. FormModal drops hidden fields from the payload, which is
      // what stops a FAQ from being submitted with banner artwork attached to it.
      form: [
        {
          name: "kind",
          label: "Content type",
          type: "select",
          options: KIND_OPTIONS,
          required: true,
          hint: "Decides which of the fields below the app actually renders.",
        },
        {
          name: "title",
          label: (v) =>
            v.kind === "FAQ"
              ? "Question"
              : v.kind === "Help Article"
                ? "Article title"
                : "Headline",
          required: true,
          placeholder: (v) =>
            ({
              Banner: "Diwali offer - flat 50% off",
              Notice: "Scheduled maintenance on 8 Nov",
              FAQ: "How long do settlements take?",
              "Help Article": "How to accept a UPI payment",
            })[v.kind],
        },
        {
          name: "subtitle",
          label: "Sub-headline",
          placeholder: "Offer ends 10 Nov",
          showIf: (v) => v.kind === "Banner" || v.kind === "Notice",
        },
        {
          name: "body",
          label: (v) =>
            v.kind === "FAQ"
              ? "Answer"
              : v.kind === "Help Article"
                ? "Article body"
                : "Description",
          type: "textarea",
          rows: 6,
          required: (v) => v.kind === "FAQ" || v.kind === "Help Article",
          placeholder: (v) =>
            v.kind === "FAQ"
              ? "Settlements are credited by 4 PM on the next working day."
              : v.kind === "Help Article"
                ? "Step 1 - open the QR scanner and enter the amount."
                : "Shown under the headline on the card.",
          validate: (v) =>
            v.kind !== "Banner" ||
            [v.body, v.imageUrl, v.icon].some((x) => String(x || "").trim())
              ? undefined
              : "A banner needs a description, an image or an icon.",
        },
        {
          name: "imageUrl",
          label: "Banner image",
          type: "image",
          folder: "banners",
          hint: "Landscape artwork, at least 600px wide. Chosen files are uploaded when picked.",
          showIf: (v) => v.kind === "Banner",
        },
        {
          name: "icon",
          label: "Icon name",
          placeholder: "gift",
          hint: "Only used when the banner has no image.",
          showIf: (v) => v.kind === "Banner",
        },
        {
          name: "ctaLabel",
          label: "Button label",
          placeholder: "Shop the offer",
          showIf: (v) => v.kind === "Banner",
        },
        {
          name: "ctaUrl",
          label: "Button link",
          type: "url",
          placeholder: "https://example.com/offers",
          showIf: (v) => v.kind === "Banner",
        },
        {
          name: "deepLink",
          label: "Opens on tap",
          type: "select",
          options: DEEP_LINK_OPTIONS,
          hint: "Every choice is a real screen in the merchant app. Picking \"External web page\" opens a link in the browser instead.",
          showIf: (v) => v.kind === "Banner" || v.kind === "Notice",
        },
        {
          name: "deepLinkUrl",
          label: "Web address",
          type: "url",
          placeholder: "https://example.com/offers",
          required: true,
          hint: "Opened in the phone's browser.",
          showIf: (v) =>
            (v.kind === "Banner" || v.kind === "Notice") &&
            v.deepLink === EXTERNAL_DEEP_LINK,
        },
        {
          name: "category",
          label: "Category",
          placeholder: "Payments",
          hint: "Groups the article in the help centre.",
          showIf: (v) => v.kind === "Help Article",
        },
        {
          name: "placement",
          label: "Placement",
          type: "select",
          // The values stay the words the form already sent (delabelize() turns them into the
          // stored slug); this is the same list the row mapper reads back, so "Other" is the only
          // way to reach a slug the app has not been given yet.
          options: [...PLACEMENT_OPTIONS.map(([word]) => word), PLACEMENT_OTHER],
          showIf: (v) => v.kind === "Banner",
        },
        {
          name: "placementSlug",
          label: "Placement value",
          placeholder: "offers_screen",
          hint: "The app shows this as an upper-case tag on the banner.",
          required: true,
          showIf: (v) => v.kind === "Banner" && v.placement === PLACEMENT_OTHER,
        },
        {
          name: "audience",
          label: "Audience",
          type: "select",
          options: AUDIENCE_OPTIONS,
          hint: "An app user sees items for their own audience plus those marked All.",
        },
        {
          name: "featured",
          label: "Feature this item",
          type: "checkbox",
          hint: "Featured items are listed before the rest.",
        },
        {
          name: "sort",
          label: "Sort order",
          type: "number",
          min: -10000,
          max: 10000,
          pattern: /^-?\d+$/,
          message: "Enter a whole number between -10000 and 10000",
          hint: "Lower numbers appear first.",
        },
        {
          name: "startsAt",
          label: "Live from",
          type: "datetime",
          hint: "Leave blank to go live as soon as it is published.",
        },
        {
          name: "endsAt",
          label: "Live until",
          type: "datetime",
          hint: "The item stops being served after this time.",
          validate: (v) =>
            v.startsAt && v.endsAt && v.endsAt <= v.startsAt
              ? "Live until must be after live from."
              : undefined,
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: ["Draft", "Published"],
          hint: "Only published items reach the app.",
        },
      ],
    },
    actions: [
      set(
        "Publish",
        "Published",
        (r) => r.status !== "Published",
        false,
        "POST /api/super-admin/v1/content/{content_ref}/publish makes the item visible to the app.",
      ),
      set(
        "Archive",
        "Archived",
        (r) => r.status !== "Archived",
        true,
        "Hides the item from the app; it stays readable in this list.",
      ),
    ],
  },
  "app-inbox": {
    title: "Merchant Inbox",
    subtitle:
      "The messages this platform sends into the merchant app's inbox. It is here because the sender is the platform, not a branch: a Super Admin either broadcasts to every merchant or picks one. A merchant's own staff see only what was addressed to them, in the app.",
    resource: "merchantInbox",
    tabField: "category",
    filters: ["audience"],
    columns: cols(
      "id:Ref",
      "title:Title",
      "category:Category",
      "deepLink:Opens On Tap",
      "audience:Audience",
      "merchant:Merchant",
      "createdBy:Created By",
      "createdOn:Created On",
    ),
    statsFor: (d) => [
      ["Notifications", plain(d.all)],
      ["Broadcasts", plain(countWhere(d, (r) => r.merchant === "All merchants"))],
      ["Targeted", plain(countWhere(d, (r) => r.merchant !== "All merchants"))],
    ],
    create: {
      label: "Send Notification",
      form: [
        { name: "title", label: "Title", required: true },
        { name: "body", label: "Message", type: "textarea", rows: 5, required: true },
        {
          name: "category",
          label: "Category",
          type: "select",
          options: [
            "General",
            "Payment",
            "Settlement",
            "Kyc",
            "Device",
            "Loan",
            "Support",
            "Security",
          ],
        },
        {
          name: "merchant",
          label: "Target merchant",
          // A code nobody can remember is not a control. This searches the same merchant list the
          // merchants screen uses and stores the code the backend asks for.
          type: "search",
          search: {
            resource: "merchants",
            placeholder: "Search by name, code, city or mobile…",
            ariaLabel: "Merchants",
            limit: 20,
            toValue: (r) => r.id,
            toLabel: (r) => r.name || r.id,
            toNote: (r) => [r.id, r.city, r.status].filter(Boolean).join(" · "),
            empty: {
              label: "Every merchant (broadcast)",
              note: "No target is stored; each merchant app receives it",
            },
          },
          hint: "Pick one merchant to message only them, or leave the broadcast choice for everyone.",
        },
        {
          name: "deepLink",
          label: "Opens on tap",
          type: "select",
          options: DEEP_LINK_OPTIONS,
          hint: "Every choice is a real screen in the merchant app. Picking \"External web page\" opens a link in the browser instead.",
        },
        {
          name: "deepLinkUrl",
          label: "Web address",
          type: "url",
          placeholder: "https://example.com/help",
          required: true,
          hint: "Opened in the phone's browser.",
          showIf: (v) => v.deepLink === EXTERNAL_DEEP_LINK,
        },
        {
          name: "imageUrl",
          label: "Header image",
          type: "image",
          folder: "notifications",
          hint: "Optional image shown above the message in the merchant inbox.",
        },
        {
          name: "audience",
          label: "Audience",
          type: "select",
          options: ["Merchant", "Collection", "All"],
        },
      ],
    },
  },
};
