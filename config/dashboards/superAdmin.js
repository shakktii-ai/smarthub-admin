

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
{label:'Branches',href:b('/branches'),icon:'Building2Icon'},
{label:'Users',href:b('/users'),icon:'UserCog'},
{label:'Audit Logs',href:b('/audit-logs'),icon:'FileSearch'},
  {label:'Merchants',href:b('/merchants'),icon:'Store'},
  // {
  //   label: 'Platform',
  //   icon: 'Store',
  //   children: [
  //     { label: 'Merchants', href: b('/merchants') },
  //     { label: 'Partners', href: b('/partners') },
  //   ],
  // },
//  {
//     label: 'Access Control',
//     icon: 'UserCog',
//     children: [
//       { label: 'Users', href: b('/users') },
//       { label: 'Audit Logs', href: b('/audit-logs') },
//     ],
//   },

  // {
  //   label: 'Approvals & Risk',
  //   icon: 'AlertTriangle',
  //   children: [
  //     { label: 'Maker-Checker Queue', href: b('/maker-checker') },
  //     { label: 'Risk Queue', href: b('/risk') },
  //   ],
  // },

  // { label: 'Finance Ledger', href: b('/ledger'), icon: 'Landmark' },

 

 

  // {
  //   label: 'Configuration',
  //   icon: 'Settings',
  //   children: [
  //     { label: 'System Configuration', href: b('/config') },
  //     { label: 'Legal Content', href: b('/legal') },
  //   ],
  // },
];