// Small helpers the page configs use to turn a live listRecords() result into stat cards.
// Rows carry rupee amounts as numbers (see rupees() in lib/api/labels), so sums need no parsing.

export const countBy = (data, ...statuses) =>
  statuses.reduce((sum, status) => sum + (data.counts[status] || 0), 0);

export const sumBy = (data, key) =>
  data.allRows.reduce((total, row) => total + (Number(row[key]) || 0), 0);

export const sumWhere = (data, key, predicate) =>
  data.allRows
    .filter(predicate)
    .reduce((total, row) => total + (Number(row[key]) || 0), 0);

export const countWhere = (data, predicate) =>
  data.allRows.filter(predicate).length;

// Most common value of a field across the loaded rows, with its count - used for
// "Top reason" style cards that the backend has no aggregate for.
export const modeOf = (data, key) => {
  const tally = {};
  data.allRows.forEach((row) => {
    const value = String(row[key] ?? "").trim();
    if (value) tally[value] = (tally[value] || 0) + 1;
  });
  const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
  return top ? `${top[0]} (${plain(top[1])})` : "—";
};

export const rupee = (n) => "₹ " + Math.round(Number(n) || 0).toLocaleString("en-IN");

export const plain = (n) => Number(n || 0).toLocaleString("en-IN");

// First day of the current month as a YYYY-MM-DD string, comparable against a row's `iso`.
export const monthStart = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
};
