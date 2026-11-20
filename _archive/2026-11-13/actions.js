'use server';

// The backend has no sales-staff domain (staff records, territories, document vault or
// verification workflow), so every action fails with the same explicit reason rather than
// writing to a table that no longer exists.
const NOT_CONNECTED =
  'Sales staff records are not connected to the backend yet. There is no staff, territory or document API.';

export async function getStaffDetail() {
  return { error: NOT_CONNECTED };
}

export async function setVerification() {
  return { error: NOT_CONNECTED };
}

export async function approveStaff() {
  return { error: NOT_CONNECTED };
}

export async function rejectStaff() {
  return { error: NOT_CONNECTED };
}

export async function setStaffActive() {
  return { error: NOT_CONNECTED };
}

export async function updateStaff() {
  return { error: NOT_CONNECTED };
}
