'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ChevronDown, LayoutDashboard, Store, Users, QrCode, ArrowLeftRight, Landmark, FileText, LifeBuoy, Bell, Settings, Headphones, X, HandCoins, CalendarClock, Wallet, AlertTriangle, UserCog, BarChart3, Banknote, Building2Icon, FileSearch } from 'lucide-react';
import { cx } from '@/components/ui';
import Image from 'next/image';

const ICONS = { LayoutDashboard, Store, Users, QrCode, ArrowLeftRight, Landmark, FileText, LifeBuoy, Bell, Settings, HandCoins, CalendarClock, Wallet, AlertTriangle, UserCog, BarChart3, Banknote, Building2Icon, FileSearch };

export default function Sidebar({ base, brand, nav, open, onClose }) {
  const path = usePathname();
  const isActive = (h) => path === h;
  const groupActive = (g) => g.children?.some((c) => isActive(c.href));
  const [expanded, setExpanded] = useState(() => Object.fromEntries(nav.filter((g) => g.children).map((g) => [g.label, groupActive(g)])));
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={onClose} />}
      <aside aria-label="Main navigation" className={cx('fixed inset-y-0 left-0 z-40 flex w-60 flex-col overflow-y-auto bg-navy text-slate-200 transition-transform lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex shrink-0 items-center justify-between px-4 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-white">
              <Image
                src="/smarthubpay.jpeg"
                alt="SmartHub Pay logo"
                fill
                className=" object-cover object-[center_38%]"
                priority
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold leading-tight text-white">{brand.title}</p>
              <p className="truncate text-xs text-slate-300">{brand.subtitle}</p>
            </div>
          </div>
          <button className="ml-2 shrink-0 lg:hidden" aria-label="Close menu" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 px-2">
          {nav.map((item) => {
            const Icon = ICONS[item.icon];
            if (!item.children) {
              return <Link key={item.label} href={item.href} onClick={onClose} aria-current={isActive(item.href) ? 'page' : undefined} className={cx('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-navy-700', isActive(item.href) && 'bg-brand text-white')}>{Icon && <Icon size={18} aria-hidden />}<span className="flex-1">{item.label}</span>{item.badge && <span className="rounded-full bg-red-500 px-1.5 text-xs text-white">{item.badge}</span>}</Link>;
            }
            const isOpen = expanded[item.label];
            return (
              <div key={item.label}>
                <button aria-expanded={!!isOpen} onClick={() => setExpanded((e) => ({ ...e, [item.label]: !e[item.label] }))} className={cx('flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-navy-700', groupActive(item) && 'text-white')}>{Icon && <Icon size={18} aria-hidden />}<span className="flex-1 text-left">{item.label}</span><ChevronDown size={14} className={cx('transition', isOpen && 'rotate-180')} aria-hidden /></button>
                {isOpen && item.children.map((c) => <Link key={c.href} href={c.href} onClick={onClose} aria-current={isActive(c.href) ? 'page' : undefined} className={cx('ml-9 block rounded-md px-3 py-1.5 text-[13px] text-slate-300 hover:text-white', isActive(c.href) && 'bg-brand/90 font-semibold text-white')}>{c.label}</Link>)}
              </div>
            );
          })}
        </nav>
        <div className="m-3 rounded-xl bg-navy-700 p-3 text-sm"><div className="flex items-center gap-2 font-semibold text-white"><Headphones size={16} aria-hidden />Need Help?</div><p className="mt-1 text-xs text-slate-300">Our support team is always here.</p><Link href={`${base}/support`} className="mt-2 block rounded-lg border border-slate-500 py-1.5 text-center text-xs font-semibold text-white hover:bg-navy">Contact Support</Link></div>
      </aside>
    </>
  );
}
