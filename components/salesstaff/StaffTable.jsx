'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Plus, Search, Users } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, Drawer, EmptyState, Pagination } from '@/components/ui';
import { FormModal } from '@/components/ui/blocks';
import { useApp } from '@/components/ui/AppContext';
import { approveStaff, getStaffDetail, rejectStaff, setStaffActive, setVerification, updateStaff } from '@/app/merchant-admin/sales-staff/actions';

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { dateStyle: 'medium' });
const Initials = ({ name }) => <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600">{name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</span>;
const Row = ({ k, v }) => <div className="flex justify-between gap-4 py-1.5 text-sm"><span className="text-slate-500">{k}</span><span className="text-right font-medium">{v ?? '-'}</span></div>;

export default function StaffTable({ rows, total, page, pageSize, counts, territories, error }) {
  const router = useRouter(); const path = usePathname(); const sp = useSearchParams();
  const setParam = (k, v) => { const p = new URLSearchParams(sp.toString()); if (v) p.set(k, v); else p.delete(k); if (k !== 'page') p.delete('page'); router.push(`${path}?${p}`); };
  const [openId, setOpenId] = useState(null);
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Sales Staff</h1><p className="text-sm text-slate-600">Manage your sales staff members and their details.</p></div>
        <Link href={`${path}/new`}><Button><Plus size={16} aria-hidden />Add Sales Staff</Button></Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[['Total Staff', counts.total], ['Active Staff', counts.active], ['Pending', counts.pending], ['Inactive', counts.inactive]].map(([k, v]) => <Card key={k}><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-blue-50 text-blue-600"><Users size={18} aria-hidden /></span><div><p className="text-sm text-slate-600">{k}</p><p className="text-2xl font-bold">{v}</p></div></div></Card>)}</div>
      <Card>
        <form className="mb-3 flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); setParam('q', new FormData(e.currentTarget).get('q')); }}>
          <label className="relative min-w-52 flex-1"><span className="sr-only">Search</span><Search size={16} className="absolute left-3 top-2.5 text-slate-400" aria-hidden /><input name="q" defaultValue={sp.get('q') || ''} placeholder="Search by name, mobile, email, employee ID…" className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm" /></label>
          <select aria-label="Status" className="rounded-lg border border-slate-300 px-2 py-2 text-sm" value={sp.get('status') || ''} onChange={(e) => setParam('status', e.target.value)}><option value="">All Status</option>{['active', 'pending', 'inactive', 'rejected'].map((s) => <option key={s} value={s}>{cap(s)}</option>)}</select>
          <select aria-label="Territory" className="rounded-lg border border-slate-300 px-2 py-2 text-sm" value={sp.get('territory') || ''} onChange={(e) => setParam('territory', e.target.value)}><option value="">All Territories</option>{territories.map((t) => <option key={t.id} value={t.id}>{t.name}{t.state ? `, ${t.state}` : ''}</option>)}</select>
          <Button variant="outline" onClick={() => router.push(path)}>Reset</Button>
        </form>
        {error ? <p role="alert" className="p-6 text-center text-red-600">{error}</p> : rows.length === 0 ? <EmptyState text="No sales staff found." /> : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="bg-slate-50 text-left text-xs text-slate-600">{['#', 'Photo', 'Name', 'Employee ID', 'Mobile', 'Territory', 'Added By (Merchant Admin)', 'Added On', 'Status', 'Actions'].map((h) => <th key={h} className="whitespace-nowrap px-3 py-2 font-semibold">{h}</th>)}</tr></thead>
            <tbody>{rows.map((r, i) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-3 py-2.5">{(page - 1) * pageSize + i + 1}</td>
                <td className="px-3 py-2.5">{r.photoUrl ? <img src={r.photoUrl} alt="" className="h-9 w-9 rounded-full object-cover" /> : <Initials name={r.full_name} />}</td>
                <td className="whitespace-nowrap px-3 py-2.5 font-medium">{r.full_name}</td><td className="whitespace-nowrap px-3 py-2.5">{r.employee_id}</td><td className="px-3 py-2.5">{r.mobile}</td>
                <td className="px-3 py-2.5">{r.territory?.name}{r.territory?.state ? `, ${r.territory.state}` : ''}</td><td className="whitespace-nowrap px-3 py-2.5">{r.addedBy}</td><td className="whitespace-nowrap px-3 py-2.5">{fmt(r.created_at)}</td>
                <td className="px-3 py-2.5"><Badge value={cap(r.status)} /></td>
                <td className="px-3 py-2.5"><Button variant="outline" className="!px-2 !py-1" onClick={() => setOpenId(r.id)}>View</Button></td>
              </tr>))}</tbody>
          </table></div>)}
        <Pagination page={page} total={total} pageSize={pageSize} onPage={(p) => setParam('page', String(p))} />
      </Card>
      {openId && <StaffDrawer id={openId} territories={territories} onClose={() => setOpenId(null)} onChanged={() => router.refresh()} />}
    </>
  );
}

function StaffDrawer({ id, territories, onClose, onChanged }) {
  const { toast } = useApp();
  const [s, setS] = useState(null); const [err, setErr] = useState(''); const [dlg, setDlg] = useState(null); const [busy, setBusy] = useState(false);
  const load = async () => { const r = await getStaffDetail(id); if (r.error) setErr(r.error); else setS(r.staff); };
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const run = async (fn, msg) => { setBusy(true); const r = await fn(); setBusy(false); if (r.ok) { toast(msg); setDlg(null); onChanged(); load(); } else toast(r.error || Object.values(r.fieldErrors || {})[0] || 'Failed', 'error'); };
  if (err) return <Drawer title="Sales Staff" onClose={onClose}><p role="alert" className="text-red-600">{err}</p></Drawer>;
  if (!s) return <Drawer title="Sales Staff" onClose={onClose}><p className="text-slate-500">Loading…</p></Drawer>;
  const link = (u, l) => (u ? <a href={u} target="_blank" rel="noopener noreferrer" className="text-brand underline">{l}</a> : 'Not provided');
  return (
    <Drawer title={s.full_name} onClose={onClose}>
      <div className="mb-2 flex items-center gap-2"><Badge value={cap(s.status)} /><span className="text-sm text-slate-500">{s.employee_id}</span></div>
      <Row k="Mobile" v={s.mobile} /><Row k="Email" v={s.email} /><Row k="Territory" v={s.territory?.name} /><Row k="Joining date" v={s.joining_date} /><Row k="Employment type" v={s.employment_type} /><Row k="Device ID" v={s.device_id} /><Row k="Address" v={s.address} />
      <Row k="PAN" v={s.panMasked} /><Row k="Bank account" v={s.bankMasked} /><Row k="ID proof type" v={s.id_proof_type} /><Row k="ID proof" v={link(s.urls.idProof, 'Open (expires in 2 min)')} /><Row k="PAN document" v={link(s.urls.panDoc, 'Open')} />
      <Row k="Added by" v={s.creator?.full_name || s.created_by_name} /><Row k="Declaration" v={`Accepted by the Merchant Admin on ${fmt(s.declaration_accepted_at)} (${s.declaration_policy_version})`} />
      {s.status === 'rejected' && <p role="alert" className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">Rejected: {s.rejection_reason}</p>}
      {s.status !== 'rejected' && (
        <div className="mt-4 rounded-lg border border-slate-200 p-3"><p className="mb-2 text-sm font-semibold">Verification</p>
          <label className="mb-2 block text-sm">Documents<select className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2" value={s.doc_verification_status} disabled={busy} onChange={(e) => run(() => setVerification(id, { docStatus: e.target.value }), 'Document verification updated')}>{['pending', 'verified', 'rejected'].map((o) => <option key={o} value={o}>{cap(o)}</option>)}</select></label>
          <label className="block text-sm">Police verification<select className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2" value={s.police_verification_status} disabled={busy} onChange={(e) => run(() => setVerification(id, { police: e.target.value }), 'Police verification updated')}>{[['pending', 'Pending'], ['done', 'Done'], ['not_required', 'Not Required']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        </div>)}
      <div className="mt-4 flex flex-wrap gap-2">
        {s.status === 'pending' && <><Button disabled={busy} onClick={() => run(() => approveStaff(id), 'Staff approved')}>Approve</Button><Button variant="danger" onClick={() => setDlg('reject')}>Reject</Button></>}
        {s.status === 'active' && <Button variant="outline" onClick={() => setDlg('deactivate')}>Deactivate</Button>}
        {s.status === 'inactive' && <Button variant="outline" disabled={busy} onClick={() => run(() => setStaffActive(id, true), 'Staff reactivated')}>Reactivate</Button>}
        {s.status !== 'rejected' && <Button variant="outline" onClick={() => setDlg('edit')}>Edit</Button>}
      </div>
      {dlg === 'reject' && <FormModal title="Reject sales staff" onClose={() => setDlg(null)} onSubmit={(v) => run(() => rejectStaff(id, v.reason), 'Staff rejected')} fields={[{ name: 'reason', label: 'Reason for rejection', required: true, pattern: /^.{5,300}$/, message: '5-300 characters' }]} />}
      {dlg === 'deactivate' && <ConfirmDialog title="Deactivate staff" message="This staff member will no longer be active. Their records are kept." busy={busy} onConfirm={() => run(() => setStaffActive(id, false), 'Staff deactivated')} onCancel={() => setDlg(null)} />}
      {dlg === 'edit' && <FormModal title="Edit staff" onClose={() => setDlg(null)} initial={{ fullName: s.full_name, mobile: s.mobile, email: s.email, territory: territories.find((t) => t.id === s.territory_id)?.name || '', deviceId: s.device_id || '', address: s.address || '' }}
        onSubmit={(v) => run(() => updateStaff(id, { ...v, territoryId: territories.find((t) => t.name === v.territory)?.id }), 'Staff updated')}
        fields={[{ name: 'fullName', label: 'Full name', required: true }, { name: 'mobile', label: 'Mobile', required: true, pattern: /^[6-9]\d{9}$/, message: '10 digits starting 6-9' }, { name: 'email', label: 'Email', required: true, pattern: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' }, { name: 'territory', label: 'Territory', type: 'select', required: true, options: territories.map((t) => t.name) }, { name: 'deviceId', label: 'Device ID' }, { name: 'address', label: 'Address' }]} />}
    </Drawer>
  );
}
