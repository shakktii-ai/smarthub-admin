'use client';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { toast as notify, ToastContainer } from 'react-toastify';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const DAY_MS = 24 * 60 * 60 * 1000;

// Labels stay static text: the window itself is computed from the real clock below, so the
// server render and the client render can never disagree about a date string.
export const RANGES = {
  '7': { label: 'Last 7 days', days: 7 },
  '10': { label: 'Last 10 days', days: 10 },
  '30': { label: 'Last 30 days', days: 30 },
};

const isoDay = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export function AppProvider({ children }) {
  const [rangeKey, setRangeKey] = useState('10');
  const [search, setSearch] = useState('');
  const toast = useCallback((message, type = 'success') => {
    if (type === 'error') notify.error(message);
    else if (type === 'warning') notify.warning(message);
    else if (type === 'info') notify.info(message);
    else notify.success(message);
  }, []);
  const range = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - (RANGES[rangeKey].days - 1) * DAY_MS);
    return { from: isoDay(from), to: isoDay(to) };
  }, [rangeKey]);
  const value = useMemo(() => ({ rangeKey, setRangeKey, range, search, setSearch, toast }), [rangeKey, range, search, toast]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <ToastContainer position="top-right" autoClose={3500} newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover theme="light" />
    </Ctx.Provider>
  );
}
