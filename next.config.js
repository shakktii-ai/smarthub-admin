/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  async redirects() {
    return [
      // Merchant Staff was retired from the merchant app; send old bookmarks to the dashboard.
      { source: '/merchant-admin/staff', destination: '/merchant-admin/dashboard', permanent: true },
    ];
  },
};
