'use client';
import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { signOut } from '@/app/login/actions';

// Reusable shell. Access control is enforced server-side in middleware.js, not here.
export default function AdminLayout({ base, brand, nav, user, searchPlaceholder = 'Search merchants, transactions, devices, staff...', children }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Sidebar base={base} brand={brand} nav={nav} open={open} onClose={() => setOpen(false)} />
      <div className="min-h-screen min-w-0 lg:pl-60">
        <Topbar base={base} user={user} onMenu={() => setOpen(true)} onLogout={() => signOut()} searchPlaceholder={searchPlaceholder} />
        <main className="mx-auto w-full max-w-screen-2xl space-y-4 p-4 sm:p-5 lg:p-6">{children}</main>
      </div>
    </>
  );
}
