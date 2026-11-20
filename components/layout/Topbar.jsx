'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search, Bell, Calendar, Menu, ChevronDown, LogOut, ShieldCheck } from 'lucide-react';
import { useApp, RANGES } from '@/components/ui/AppContext';

export default function Topbar({ base, user, onMenu, onLogout, searchPlaceholder, searchTarget }) {
  const { rangeKey, setRangeKey, search, setSearch } = useApp();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  // Submit always lands somewhere real: the dashboard's configured search target
  // (the term filters that page's list through AppContext), or the input is
  // disabled on dashboards that have no list route to search yet.
  const onSearch = (e) => { e.preventDefault(); if (search && searchTarget) router.push(searchTarget); };
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
      <button className="lg:hidden" aria-label="Open menu" onClick={onMenu}><Menu size={22} /></button>
      <form onSubmit={onSearch} role="search" className="relative max-w-md flex-1"><Search size={16} className="absolute left-3 top-2.5 text-slate-400" aria-hidden /><input aria-label="Search" value={search} onChange={(e) => setSearch(e.target.value)} disabled={!searchTarget} title={searchTarget ? undefined : 'Search is not wired up on this dashboard yet.'} placeholder={searchPlaceholder} className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-brand focus:outline-none disabled:opacity-60" /></form>
      <div className="ml-auto flex items-center gap-3">
        <label className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm sm:flex"><Calendar size={16} aria-hidden /><span className="sr-only">Date range</span><select value={rangeKey} onChange={(e) => setRangeKey(e.target.value)} className="bg-transparent focus:outline-none">{Object.entries(RANGES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
        <Link href={`${base}/notifications`} aria-label="Notifications" className="relative rounded-lg p-2 hover:bg-slate-100"><Bell size={20} /></Link>
        <div className="relative">
          <button onClick={() => setMenu((m) => !m)} aria-expanded={menu} className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-full bg-navy font-semibold text-white">{user.name[0]}</span><span className="hidden text-left leading-tight md:block"><span className="block text-sm font-semibold">{user.name}</span><span className="block text-xs text-slate-500">{user.role}</span></span><ChevronDown size={14} aria-hidden /></button>
          {menu && <div className="absolute right-0 mt-2 w-48 rounded-lg border bg-white p-1 shadow-lg">
            <Link href="/account/security" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-slate-100"><ShieldCheck size={14} aria-hidden />Security &amp; MFA</Link>
            <button onClick={onLogout} className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-slate-100"><LogOut size={14} aria-hidden />Log out</button>
          </div>}
        </div>
      </div>
    </header>
  );
}
