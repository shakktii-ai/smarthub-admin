export const base = '/super-admin';

export const brand = {
  title: 'SMARTHUB PAY',
  subtitle: 'Super Admin',
};

export const user = {
  name: 'Amit Sharma',
  role: 'Super Admin',
};

const b = (p) => `${base}${p}`;

export const nav = [
  { label: 'Dashboard', href: b('/dashboard'), icon: 'LayoutDashboard' },
  { label: 'Branches', href: b('/branches'), icon: 'Building2Icon' },
  { label: 'Users', href: b('/users'), icon: 'UserCog' },
  { label: 'Audit Logs', href: b('/audit-logs'), icon: 'FileSearch' },
  { label: 'Security & MFA', href: '/account/security', icon: 'ShieldCheck' },
  { label: 'Merchants', href: b('/merchants'), icon: 'Store' },
  { label: 'Applications', href: b('/applications'), icon: 'ClipboardCheck' },
  { label: 'Partners', href: b('/partners'), icon: 'Users' },
  { label: 'App Content', href: b('/app-content'), icon: 'FileText' },
  { label: 'Merchant Inbox', href: b('/app-inbox'), icon: 'Bell' },
  { label: 'Campaigns', href: b('/campaigns'), icon: 'Megaphone' },
  { label: 'Legal Documents', href: b('/legal-documents'), icon: 'FileText' },
  {
    label: 'Approvals & Risk',
    icon: 'AlertTriangle',
    children: [
      { label: 'Approvals', href: b('/maker-checker') },
      { label: 'Risk & Rules', href: b('/risk') },
    ],
  },
  { label: 'Finance Ledger', href: b('/ledger'), icon: 'Landmark' },
  {
    label: 'Configuration',
    icon: 'Settings',
    children: [
      { label: 'System Configuration', href: b('/config') },
      { label: 'Merchant App Switches', href: b('/app-flags') },
      { label: 'Legal Content', href: b('/legal') },
    ],
  },
];
