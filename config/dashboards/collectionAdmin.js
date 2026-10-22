export const base = '/collection-admin';
export const brand = { title: 'SMARTHUB PAY', subtitle: 'Lending & Collection' };
export const user = { name: 'Amit Sharma', role: 'Collection Admin' };
const b = (p) => `${base}${p}`;
export const nav = [
  { label: 'Dashboard', href: b('/dashboard'), icon: 'LayoutDashboard' },
  { label: 'Loan Management', icon: 'Banknote', children: [{ label: 'Loan Applications', href: b('/loans/applications') }, { label: 'Loan Accounts', href: b('/loans/accounts') }, { label: 'Disbursements', href: b('/loans/disbursements') }] },
  { label: 'Borrowers', icon: 'Users', children: [{ label: 'All Borrowers', href: b('/borrowers') }, { label: 'KYC & Documents', href: b('/borrowers/kyc') }] },
  { label: 'EMI Management', icon: 'CalendarClock', children: [{ label: 'EMI Schedule', href: b('/emi/schedule') }, { label: 'Upcoming EMI', href: b('/emi/upcoming') }] },
  { label: 'Collections', icon: 'HandCoins', children: [{ label: 'Collection Overview', href: b('/collections') }, { label: 'Follow-ups', href: b('/collections/followups') }, { label: 'Promise to Pay', href: b('/collections/promises') }] },
  { label: 'Payments', icon: 'Wallet', children: [{ label: 'Payments & Receipts', href: b('/payments') }, { label: 'Failed Payments', href: b('/payments/failed') }] },
  { label: 'Overdue Management', icon: 'AlertTriangle', children: [{ label: 'Overdue Accounts', href: b('/overdue') }, { label: 'Aging & Delinquency', href: b('/overdue/aging') }] },
  { label: 'Collection Agents', icon: 'UserCog', children: [{ label: 'Agents', href: b('/agents') }, { label: 'Assignments', href: b('/agents/assignments') }, { label: 'Performance', href: b('/agents/performance') }] },
  { label: 'Reports & Reconciliation', icon: 'BarChart3', children: [{ label: 'Collection Reports', href: b('/reports/collection') }, { label: 'Loan Reports', href: b('/reports/loans') }, { label: 'Reconciliation', href: b('/reports/reconciliation') }] },
  { label: 'Support & Disputes', icon: 'LifeBuoy', children: [{ label: 'Disputes & Complaints', href: b('/support') }] },
  { label: 'Notifications', href: b('/notifications'), icon: 'Bell', badge: 5 },
  { label: 'Settings', href: b('/settings'), icon: 'Settings' },
];
