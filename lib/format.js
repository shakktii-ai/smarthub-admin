export const inr = (n) => '₹ ' + Number(n || 0).toLocaleString('en-IN');
export const num = (n) => Number(n || 0).toLocaleString('en-IN');
export const fmtDate = (iso) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
