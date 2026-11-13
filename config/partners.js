// The partner registry's vocabulary. These keys are the values the backend's PartnerType /
// PartnerStatus enums accept; a mismatch is a 422, so the two lists are the contract and the
// dashboard must not invent a sixth type here.
export const PARTNER_TYPES = {
  payment_gateway: 'Payment gateway',
  acquirer: 'Acquirer',
  sponsor_bank: 'Sponsor bank',
  lender: 'Lender',
  distributor: 'Distributor',
  technology: 'Technology / software',
  vendor: 'Vendor',
  referral: 'Referral partner',
};

export const PARTNER_STATUSES = {
  active: 'Active',
  pending: 'Pending',
  inactive: 'Inactive',
  suspended: 'Suspended',
};

// What a row means in this product, said once on the screen instead of in a comment nobody opens.
export const PARTNER_EXPLAINER =
  'A partner is a company we route money through or buy from — an acquirer or payment gateway, ' +
  'the sponsor bank behind UPI, a lender, a KYC or messaging vendor. This is the contact-and-status ' +
  'registry for those relationships. No payment rail, settlement run or campaign reads this table ' +
  'yet, so adding a partner here documents the relationship; it does not start traffic.';

export const PARTNER_TYPE_OPTIONS = Object.entries(PARTNER_TYPES).map(
  ([value, label]) => [label, value]
);

export const PARTNER_STATUS_OPTIONS = Object.entries(PARTNER_STATUSES).map(
  ([value, label]) => [label, value]
);
