// UPI Admin navigation (ready for future development). Add menu items + pages under app/upi-admin/.
export const base = '/upi-admin';
// No list route exists on this dashboard yet, so search has nowhere to submit
// to — Topbar disables the input rather than routing to a dead 404.
export const searchTarget = null;
export const brand = { title: 'SMARTHUB PAY', subtitle: 'UPI Admin' };
export const user = { name: 'Amit Sharma', role: 'UPI Admin' };
export const nav = [{ label: 'Dashboard', href: '/upi-admin/dashboard', icon: 'LayoutDashboard' }, { label: 'Security & MFA', href: '/account/security', icon: 'ShieldCheck' }];
