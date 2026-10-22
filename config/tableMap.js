// Map UI "resources" to Supabase tables/columns. Defaults: table = resource name, columns snake_case of the field names.
export const TABLES = { merchants: 'merchants', transactions: 'transactions', sales: 'sales_staff', onboarding: 'merchant_applications' };
export const SEARCH_COLUMNS = { merchants: ['name', 'legal_name', 'mobile', 'id'], transactions: ['id', 'merchant', 'utr'], sales: ['name', 'mobile', 'email'] };
export const DATE_COLUMNS = { transactions: 'created_at', merchants: 'created_at' };
