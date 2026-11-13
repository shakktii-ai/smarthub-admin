// One vocabulary for the app-content screens. The create form, the edit pre-fill, the status
// actions and the row all read from here, so the same five words cannot drift into three lists.
// Labels are what the operator sees; the value beside each is what the backend column stores
// (AppContentKind / AppContentAudience / AppContentStatus are snake_case StrEnums).
export const KIND_OPTIONS = ["Banner", "Notice", "FAQ", "Help Article"];

export const AUDIENCE_OPTIONS = ["Merchant", "Collection", "All"];

// Status is not a form field: it moves on the publish/archive routes, which stamp
// published_at and write their own audit event. A status box on the form would be a second,
// quieter way to do the same thing.
export const STATUS_LABELS = { draft: "Draft", published: "Published", archived: "Archived" };

// The app matches on the placement slug, so "Other" is where an operator types a slug the list
// does not have yet.
export const PLACEMENT_OPTIONS = [
  ["Home Banner", "home_banner"],
  ["Dashboard", "dashboard"],
  ["Checkout", "checkout"],
  ["Transactions", "transactions"],
  ["Help Centre", "help_centre"],
];

export const PLACEMENT_OTHER = "Other";

export const PLACEMENT_LABELS = new Map(PLACEMENT_OPTIONS.map(([label, slug]) => [slug, label]));
export const PLACEMENT_SLUGS = new Map(PLACEMENT_OPTIONS.map(([label, slug]) => [label, slug]));
