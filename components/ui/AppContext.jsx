'use client';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { toast as notify, ToastContainer } from 'react-toastify';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export const RANGES = { '7': { label: 'Oct 4, 2026 - Oct 10, 2026', from: '2026-10-04' }, '10': { label: 'Oct 1, 2026 - Oct 10, 2026', from: '2026-10-01' }, '30': { label: 'Last 30 days', from: '2026-09-11' } };

export function AppProvider({ children }) {
  const [rangeKey, setRangeKey] = useState('10');
  const [search, setSearch] = useState('');
  const toast = useCallback((message, type = 'success') => {
    if (type === 'error') notify.error(message);
    else if (type === 'warning') notify.warning(message);
    else if (type === 'info') notify.info(message);
    else notify.success(message);
  }, []);
  const range = useMemo(() => ({ from: RANGES[rangeKey].from, to: '2026-10-10' }), [rangeKey]);
  const value = useMemo(() => ({ rangeKey, setRangeKey, range, search, setSearch, toast }), [rangeKey, range, search, toast]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <ToastContainer position="top-right" autoClose={3500} newestOnTop closeOnClick pauseOnFocusLoss draggable pauseOnHover theme="light" />
    </Ctx.Provider>
  );
}
