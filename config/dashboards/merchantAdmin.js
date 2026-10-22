// Menu config per dashboard. A future Super Admin dashboard only needs its own array like this.
export const base = '/merchant-admin';
export const brand = { title: 'SMARTHUB PAY', subtitle: 'Merchant Admin' };
export const user = { name: 'Amit Sharma', role: 'Merchant Admin' };

export const nav = [
  { label: 'Dashboard', href: '/merchant-admin/dashboard', icon: 'LayoutDashboard' },
  { label: 'Merchants', icon: 'Store', children: [
    { label: 'All Merchants', href: '/merchant-admin/merchants' },
    { label: 'Onboarding / KYC', href: '/merchant-admin/merchants/onboarding' },
    { label: 'KYC Applications', href: '/merchant-admin/merchants/onboarding/applications' },
    { label: 'Merchant Categories', href: '/merchant-admin/merchants/categories' },
    { label: 'Merchant Groups', href: '/merchant-admin/merchants/groups' } ] },
  { label: 'Sales Staff', icon: 'Users', children: [{ label: 'All Sales Staff', href: '/merchant-admin/sales-staff' }, { label: 'Add Sales Staff', href: '/merchant-admin/sales-staff/new' }] },
  { label: 'QR & Devices', icon: 'QrCode', children: [
    { label: 'QR Management', href: '/merchant-admin/devices/qr' },
    { label: 'POS / Soundbox', href: '/merchant-admin/devices/pos' },
    { label: 'Device Inventory', href: '/merchant-admin/devices/inventory' } ] },
  { label: 'Transactions', icon: 'ArrowLeftRight', children: [
    { label: 'All Transactions', href: '/merchant-admin/transactions' },
    { label: 'Failed Transactions', href: '/merchant-admin/transactions/failed' },
    { label: 'Refunds / Reversals', href: '/merchant-admin/transactions/refunds' } ] },
  { label: 'Settlements', icon: 'Landmark', children: [
    { label: 'Settlement List', href: '/merchant-admin/settlements' },
    { label: 'Payouts', href: '/merchant-admin/settlements/payouts' },
    { label: 'Reconciliation', href: '/merchant-admin/settlements/reconciliation' },
    { label: 'Settlement Reports', href: '/merchant-admin/settlements/reports' } ] },
  { label: 'Reports', icon: 'FileText', children: [
    { label: 'Merchant Reports', href: '/merchant-admin/reports/merchants' },
    { label: 'Transaction Reports', href: '/merchant-admin/reports/transactions' },
    { label: 'Sales Reports', href: '/merchant-admin/reports/sales' } ] },
  { label: 'Support & Disputes', href: '/merchant-admin/support', icon: 'LifeBuoy' },
  { label: 'Notifications', href: '/merchant-admin/notifications', icon: 'Bell', badge: 3 },
  { label: 'Settings', href: '/merchant-admin/settings', icon: 'Settings' },
];
