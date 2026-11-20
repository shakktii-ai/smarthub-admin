'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Pencil, Save, X, ShieldCheck, Wallet, Users, Receipt, Info } from 'lucide-react';
import { Button, Card, Spinner, inputCls, cx } from '@/components/ui';
import { api } from '@/lib/api/browser';
import { useApp } from '@/components/ui/AppContext';

function money(paise) {
  const rupees = Math.floor(Number(paise || 0) / 100);
  const paisa = Number(paise || 0) % 100;
  return `₹${rupees.toLocaleString('en-IN')}.${String(paisa).padStart(2, '0')}`;
}

function fromInput(value) {
  const text = String(value || '').trim();
  const [rupees, paise = ''] = text.split('.');
  const whole = Number(rupees);
  const frac = paise.padEnd(2, '0').slice(0, 2);
  if (!Number.isFinite(whole) || !/^\d{1,2}$/.test(frac)) return null;
  return whole * 100 + Number(frac);
}

function effectivePaise(plan) {
  const mrp = Number(plan?.price_paise || 0);
  const d = Number(plan?.discount_percent || 0);
  if (!(d > 0)) return mrp;
  return Math.max(0, mrp - Math.floor((mrp * d) / 100));
}

export default function TokensPage() {
  const { toast } = useApp();
  const [summary, setSummary] = useState({ plans: [], wallets: [], query: '', q: '' });
  const [plans, setPlans] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [tab, setTab] = useState('plans');
  const [busyId, setBusyId] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    slug: '',
    name: '',
    tokens: '',
    price: '',
    discountPercent: '',
    sortOrder: '',
  });
  const [editing, setEditing] = useState(null);
  const [walletQuery, setWalletQuery] = useState('');

  async function load() {
    try {
      const [plansRows, walletRows] = await Promise.all([
        api.get('/api/collection-admin/v1/tokens/plans'),
        api.get('/api/collection-admin/v1/tokens/wallets', { limit: 200, offset: 0 }),
      ]);
      setPlans(Array.isArray(plansRows) ? plansRows : []);
      setWallets(walletRows?.items || []);
    } catch (e) {
      toast(e.message || 'Could not load tokens.', 'error');
    }
  }

  useEffect(() => { load(); }, []);

  async function createPlan() {
    const price = fromInput(form.price);
    const tokens = Number(form.tokens);
    if (!form.slug || !form.name || !Number.isInteger(tokens) || tokens <= 0 || price === null) {
      toast('Fill slug, name, tokens (>0) and price (rupees.xx).', 'error');
      return;
    }
    setBusyId('create');
    try {
      await api.post('/api/collection-admin/v1/tokens/plans', {
        slug: form.slug.trim().toLowerCase(),
        name: form.name.trim(),
        tokens,
        price_paise: price,
        discount_percent: Number(form.discountPercent || 0),
        sort_order: Number(form.sortOrder || 0),
      });
      setForm({ slug: '', name: '', tokens: '', price: '', discountPercent: '', sortOrder: '' });
      setEditing(null);
      setShowForm(false);
      toast('Plan created.', 'success');
      load();
    } catch (e) {
      toast(e.message || 'Could not create plan.', 'error');
    } finally {
      setBusyId('');
    }
  }

  async function updatePlan(plan) {
    const price = fromInput(editing?.price ?? editing?.priceInput);
    const tokens = editing?.tokens !== undefined ? Number(editing.tokens) : plan.tokens;
    try {
      await api.patch(`/api/collection-admin/v1/tokens/plans/${plan.id}`, {
        name: editing?.name || plan.name,
        price_paise: price === null ? undefined : price,
        discount_percent: editing?.discountPercent !== undefined ? Number(editing.discountPercent) : plan.discount_percent,
        sort_order: editing?.sortOrder !== undefined ? Number(editing.sortOrder) : plan.sort_order,
        active: editing?.active !== undefined ? editing.active : plan.active,
      });
      setEditing(null);
      toast('Plan updated.', 'success');
      load();
    } catch (e) {
      toast(e.message || 'Could not update plan.', 'error');
    }
  }

  async function issueTokens(userId) {
    const count = window.prompt('Tokens to issue?');
    if (!count) return;
    const tokens = Number(count);
    if (!Number.isFinite(tokens) || tokens <= 0) return;
    const reason = window.prompt('Reason (audit note)?') || 'manual issue';
    try {
      await api.post(`/api/collection-admin/v1/tokens/wallets/${userId}/issue`, { tokens, reason });
      toast('Tokens issued.', 'success');
      load();
    } catch (e) {
      toast(e.message || 'Could not issue tokens.', 'error');
    }
  }

  const query = walletQuery.trim().toLowerCase();
  const shownWallets = query
    ? wallets.filter((w) => [w.phone, w.full_name, w.agent_code, w.user_id].map((v) => String(v || '').toLowerCase()).some((s) => s.includes(query)))
    : wallets;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Token Plans</h1>
          <p className="mt-1 text-sm text-slate-500">Manage plans, set prices with discount and issue tokens to agents. 1 token = 1 mandate.</p>
        </div>
        <button
          onClick={() => setShowGuide((v) => !v)}
          title={showGuide ? 'Hide the guide' : 'How to add a plan'}
          aria-label="How to add a plan"
          aria-pressed={showGuide}
          className="rounded-full border border-sky-200 bg-sky-50 p-2 text-sky-600 transition hover:bg-sky-100"
        >
          <Info size={18} />
        </button>
      </div>

      {showGuide && (
        <Card className="border-sky-100 bg-sky-50">
          <div className="flex items-start gap-3 p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" aria-hidden />
            <div className="text-[13px] leading-5 text-sky-900">
              <p className="font-bold">How to add a plan (and make it buyable in the app)</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5">
                <li><strong>Slug</strong> — unique machine name, lowercase with underscores, e.g. <code>starter_100</code>. Used internally; never shown as-is.</li>
                <li><strong>Name</strong> — what the user sees in the app, e.g. "Starter 100".</li>
                <li><strong>Tokens</strong> — how many mandates this plan buys (whole number, e.g. <code>25</code> gives 25 mandates).</li>
                <li><strong>Price</strong> — list price (MRP), in rupees with two decimals, e.g. <code>99.00</code> = ₹99. The discount below is applied at checkout, so the card charges the reduced amount.</li>
                <li><strong>Discount %</strong> — actually applied at checkout (e.g. <code>10</code> charges 90% of the price and shows the MRP struck through with the offer price bold). Use 0 for none.</li>
                <li><strong>Sort</strong> — display order in the app; lower numbers show first.</li>
              </ol>
              <p className="mt-2">Tap <strong>+ Add plan</strong> to reveal the form, fill it in and tap <strong>Create plan</strong>. The plan appears instantly in the app under Profile → Token wallet → Buy tokens; the user pays via the Zaakpay checkout and the wallet credits automatically after the payment webhook.</p>
              <p className="mt-1"><strong>Free/manual issue:</strong> Wallets tab → search the agent (phone / name / agent code) → <strong>Issue</strong> → enter tokens and a reason for the audit log.</p>
              <p className="mt-1">To retire a plan, edit it and untick <strong>Active</strong> — it disappears from the app immediately. Tokens and transactions are never deleted.</p>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-center gap-2 pb-4">
          {['plans', 'wallets', 'transactions'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cx(
                'rounded-full px-4 py-2 text-sm font-semibold transition',
                tab === t ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              {t === 'plans' ? 'Plans' : t === 'wallets' ? 'Wallets' : 'Transactions'}
            </button>
          ))}
        </div>

        {tab === 'plans' && (
          <div className="space-y-4">
            {!showForm ? (
              <div className="flex items-center justify-end">
                <Button onClick={() => setShowForm(true)}>
                  <Plus size={16} /> Add plan
                </Button>
              </div>
            ) : (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">New plan</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  <input className={inputCls} placeholder="slug (star_ter)" autoFocus value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                  <input className={inputCls} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <input className={inputCls} placeholder="Tokens" inputMode="numeric" value={form.tokens} onChange={(e) => setForm({ ...form, tokens: e.target.value })} />
                  <input className={inputCls} placeholder="Price ₹ MRP (e.g., 99.00)" inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                  <input className={inputCls} placeholder="Discount %" inputMode="numeric" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value })} />
                  <input className={inputCls} placeholder="Sort" inputMode="numeric" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => setShowForm(false)} className="rounded-full px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-200">Cancel</button>
                  <Button onClick={createPlan} disabled={busyId === 'create'}>
                    {busyId === 'create' ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Create plan
                  </Button>
                </div>
              </div>
            )}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr><th className="px-3 py-2">Slug</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Tokens</th><th className="px-3 py-2">Price</th><th className="px-3 py-2">Discount</th><th className="px-3 py-2">Sort</th><th className="px-3 py-2">Active</th><th className="px-3 py-2"></th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {plans.map((p) => (
                    <tr key={p.id}>
                      <td className="px-3 py-2 font-mono text-slate-700">{p.slug}</td>
                      <td className="px-3 py-2">
                        {editing?.id === p.id ? (
                          <input className={inputCls} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                        ) : <span className="font-medium">{p.name}</span>}
                      </td>
                      <td className="px-3 py-2">{p.tokens}</td>
                      <td className="px-3 py-2">
                        {editing?.id === p.id ? (
                          <input className={inputCls} inputMode="decimal" value={editing.price ?? money(p.price_paise).replace('₹', '')} onChange={(e) => setEditing({ ...editing, price: e.target.value })} />
                        ) : (
                          <div>
                            <span>{money(p.price_paise)}</span>
                            {Number(p.discount_percent) > 0 && (
                              <span className="block text-[10px] font-semibold text-emerald-600">
                                pay {money(effectivePaise(p))}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {editing?.id === p.id ? (
                          <input className={inputCls} inputMode="numeric" value={editing.discountPercent ?? p.discount_percent} onChange={(e) => setEditing({ ...editing, discountPercent: e.target.value })} />
                        ) : `${p.discount_percent}%`}
                      </td>
                      <td className="px-3 py-2">
                        {editing?.id === p.id ? (
                          <input className={inputCls} inputMode="numeric" value={editing.sortOrder ?? p.sort_order} onChange={(e) => setEditing({ ...editing, sortOrder: e.target.value })} />
                        ) : p.sort_order}
                      </td>
                      <td className="px-3 py-2">
                        {editing?.id === p.id ? (
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                            <input
                              type="checkbox"
                              checked={editing?.active ?? p.active}
                              onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                            />
                            Visible
                          </label>
                        ) : (p.active ? 'Yes' : 'No')}
                      </td>
                      <td className="px-3 py-2">
                        {editing?.id === p.id ? (
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={() => updatePlan(p)}><Save size={14} /> Save</Button>
                            <Button variant="outline" onClick={() => setEditing(null)}><X size={14} /></Button>
                          </div>
                        ) : (
                          <button className="text-brand" onClick={() => setEditing({ id: p.id, name: p.name, price: money(p.price_paise).replace('₹', ''), discountPercent: p.discount_percent, sortOrder: p.sort_order, active: p.active })}><Pencil size={14} /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {plans.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-400">No plans yet. Add the first one above.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'wallets' && (
          <div className="space-y-3">
            <input className={inputCls} placeholder="Search by phone / name / agent code" value={walletQuery} onChange={(e) => setWalletQuery(e.target.value)} />
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr><th className="px-3 py-2">User</th><th className="px-3 py-2">Phone</th><th className="px-3 py-2">Balance</th><th className="px-3 py-2">Purchased</th><th className="px-3 py-2">Consumed</th><th className="px-3 py-2"></th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shownWallets.map((w) => (
                    <tr key={w.user_id}>
                      <td className="px-3 py-2 font-medium">{w.full_name || `User #${w.user_id}`}{w.agent_code ? ` · ${w.agent_code}` : ''}</td>
                      <td className="px-3 py-2 font-mono">{w.phone || '—'}</td>
                      <td className="px-3 py-2 font-bold text-brand">{w.balance}</td>
                      <td className="px-3 py-2">{w.lifetime_purchased}</td>
                      <td className="px-3 py-2">{w.lifetime_consumed}</td>
                      <td className="px-3 py-2">
                        <button className="text-brand" onClick={() => issueTokens(w.user_id)}>Issue</button>
                      </td>
                    </tr>
                  ))}
                  {shownWallets.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-400">No wallets to show.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'transactions' && (
          <div className="space-y-3 text-sm text-slate-600">
            <p>Transaction history is read from the wallet view. Select a wallet row under <em>Wallets</em>, then use the per-wallet endpoint (already wired to the backend) for audit detail; use the app Profile → Token wallet for see each user&apos;s own history.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
