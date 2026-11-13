// The merchant lifecycle vocabulary, kept in one place because the backend enforces it.
// These keys are the values the FastAPI enums accept; a sixth status typed here would be a 422.

// MerchantApplicationStatus — the paperwork the merchant app captures.
export const APPLICATION_STATUSES = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under Review',
  approved: 'Approved',
  rejected: 'Rejected',
  active: 'Active',
};

// MerchantStatus — whether the merchant can take money today.
export const MERCHANT_STATUSES = {
  draft: 'Draft',
  pending: 'Pending',
  active: 'Active',
  suspended: 'Suspended',
  rejected: 'Rejected',
};

// MerchantOnboardingStatus — how far the merchant record has walked through review.
export const MERCHANT_ONBOARDING_STATUSES = {
  lead: 'Lead',
  application_submitted: 'Application submitted',
  under_review: 'Under review',
  approved: 'Approved',
  rejected: 'Rejected',
  active: 'Active',
  suspended: 'Suspended',
};

// MerchantKycStatus — the four provider checks the KYC profile records.
export const MERCHANT_KYC_STATUSES = {
  not_started: 'Not started',
  pending: 'Pending',
  verified: 'Verified',
  rejected: 'Rejected',
};

// ONBOARDING_TRANSITIONS in the backend service is the authority. This mirrors it so the
// dashboard offers the next legal step instead of a row of buttons that mostly 409.
export const MERCHANT_ONBOARDING_NEXT = {
  lead: [['submit', 'Mark application submitted']],
  application_submitted: [['review', 'Open review'], ['reject', 'Reject application']],
  under_review: [['approve', 'Approve application'], ['reject', 'Reject application']],
  approved: [['activate', 'Activate merchant']],
  active: [],
  suspended: [['activate', 'Reactivate merchant']],
  rejected: [],
};

export const APPLICATION_EXPLAINER =
  'These are the onboarding applications merchants submit from their own app. This queue is where ' +
  'one is opened, every uploaded document is looked at and verified, the bank proof is confirmed and ' +
  'the application is approved or rejected. Nothing here is added by hand: an application only ' +
  'appears once a merchant has filled the form and paid the KYC steps.';

export const MERCHANT_EXPLAINER =
  'A merchant is a business that accepts payments through us. The row carries two lifecycles: the ' +
  'onboarding status says how far review has got, the merchant status says whether it can take money ' +
  'right now. Approving needs a Zaakpay or custom identifier, and every action here is written to the ' +
  'audit trail against the merchant code.';
