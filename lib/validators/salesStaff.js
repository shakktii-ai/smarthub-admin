import { isUuid } from './admin';

export const ID_PROOF_TYPES = ['Aadhaar (Masked Copy)', 'Voter ID', 'Passport', 'Driving Licence'];
export const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract'];
export const POLICE_STATUSES = ['pending', 'done', 'not_required'];
export const DOC_STATUSES = ['pending', 'verified', 'rejected'];
const t = (x) => String(x ?? '').trim();

// Shared by the browser form (UX) and the server (authoritative).
export function validateStaff(v, { partial = false } = {}) {
  const e = {};
  if (t(v.fullName).length < 2 || t(v.fullName).length > 100) e.fullName = 'Enter the full name (2-100 characters)';
  if (!/^[6-9]\d{9}$/.test(t(v.mobile))) e.mobile = 'Enter 10 digits starting 6-9';
  if (!/^\S+@\S+\.\S+$/.test(t(v.email)) || t(v.email).length > 254) e.email = 'Enter a valid email address';
  if (!isUuid(v.territoryId)) e.territoryId = 'Select a territory';
  if (t(v.deviceId) && !/^[A-Za-z0-9._-]{1,50}$/.test(t(v.deviceId))) e.deviceId = 'Letters, digits . _ - only (max 50)';
  if (t(v.address).length > 300) e.address = 'Maximum 300 characters';
  if (partial) return e;
  const d = t(v.joiningDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d))) e.joiningDate = 'Select a valid joining date';
  else if (Date.parse(d) > Date.now() + 366 * 864e5) e.joiningDate = 'Joining date is too far in the future';
  if (t(v.employmentType) && !EMPLOYMENT_TYPES.includes(v.employmentType)) e.employmentType = 'Invalid employment type';
  if (t(v.panNumber) && !/^[A-Z]{5}\d{4}[A-Z]$/.test(t(v.panNumber).toUpperCase())) e.panNumber = 'Format: ABCDE1234F';
  if (!ID_PROOF_TYPES.includes(v.idProofType)) e.idProofType = 'Select an ID proof type';
  if (t(v.bankAccountNumber) && !/^\d{9,18}$/.test(t(v.bankAccountNumber))) e.bankAccountNumber = '9-18 digits';
  if (t(v.bankAccountNumber) && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(t(v.ifsc).toUpperCase())) e.ifsc = 'IFSC required (format: SBIN0001234)';
  if (!t(v.bankAccountNumber) && t(v.ifsc) && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(t(v.ifsc).toUpperCase())) e.ifsc = 'Invalid IFSC';
  if (v.declaration !== true && v.declaration !== 'true') e.declaration = 'You must confirm the declaration';
  return e;
}
