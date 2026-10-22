
export const ADMIN_ROLES = [
  'merchant_admin',
  'collection_admin',
  'upi_admin',
];

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value) => UUID.test(String(value || ''));

export function validateAdmin(values = {}) {
  const errors = {};
  const t = (value) => String(value || '').trim();

  // Full name
  if (t(values.fullName).length < 2 || t(values.fullName).length > 100) {
    errors.fullName = 'Enter the full name (2-100 characters)';
  }

  // Official email
  const email = t(values.email);

  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
    errors.email = 'Enter a valid official email';
  }

  // Dashboard role
  if (!ADMIN_ROLES.includes(values.role)) {
    errors.role = 'Select a dashboard role';
  }

  // Optional mobile number
  if (t(values.mobile) && !/^[6-9]\d{9}$/.test(t(values.mobile))) {
    errors.mobile = 'Enter 10 digits starting 6-9';
  }

  // Branch required for Merchant Admin and Collection Admin
  if (
    ['merchant_admin', 'collection_admin'].includes(values.role) &&
    !isUuid(values.branchId)
  ) {
    errors.branchId = 'Please select a valid branch';
  }

  // Optional reporting manager
  if (
    values.reportingManagerId &&
    !isUuid(values.reportingManagerId)
  ) {
    errors.reportingManagerId = 'Invalid manager';
  }

  return errors;
}
