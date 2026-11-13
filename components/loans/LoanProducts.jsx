'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Loader2 } from 'lucide-react';
import { Button, Card, Field, Spinner, inputCls, cx } from '@/components/ui';
import { useApp } from '@/components/ui/AppContext';
import { api } from '@/lib/api/browser';

const DOC_TYPES = [
  { value: 'aadhaar_front', label: 'Aadhaar — front' },
  { value: 'aadhaar_back', label: 'Aadhaar — back' },
  { value: 'pan_card', label: 'PAN card' },
  { value: 'address_proof', label: 'Address proof' },
  { value: 'photo', label: 'Borrower photograph' },
  { value: 'bank_proof', label: 'Bank proof' },
  { value: 'other', label: 'Other' },
];

const EMPTY_FORM = {
  product_code: '',
  name: '',
  loan_type: 'personal',
  interest_method: 'reducing_balance',
  min_amount_paise: 0,
  max_amount_paise: 0,
  min_tenure_months: 1,
  max_tenure_months: 24,
  annual_interest_rate_bps: 1200,
  processing_fee_bps: 100,
  late_fee_bps: 0,
  status: 'active',
  required_documents: [],
  autopay_required: false,
};

export default function LoanProducts() {
  const { toast } = useApp();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | product_code
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const page = await api.get('/api/loans/v1/products', { limit: 200, offset: 0 });
      setProducts(Array.isArray(page?.items) ? page.items : []);
    } catch (e) {
      setError(e.message || 'Could not load loan products.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setForm(EMPTY_FORM);
    setEditing('new');
  }

  function openEdit(product) {
    setForm({
      product_code: product.product_code,
      name: product.name,
      loan_type: product.loan_type,
      interest_method: product.interest_method,
      min_amount_paise: product.min_amount_paise,
      max_amount_paise: product.max_amount_paise,
      min_tenure_months: product.min_tenure_months,
      max_tenure_months: product.max_tenure_months,
      annual_interest_rate_bps: product.annual_interest_rate_bps,
      processing_fee_bps: product.processing_fee_bps,
      late_fee_bps: product.late_fee_bps,
      status: product.status,
      required_documents: (product.required_documents || []).map(d => d.doc_type),
      autopay_required: Boolean(product.autopay_required),
    });
    setEditing(product.product_code);
  }

  function toggleDoc(docType) {
    setForm((prev) => {
      const set = new Set(prev.required_documents);
      if (set.has(docType)) set.delete(docType);
      else set.add(docType);
      return { ...prev, required_documents: [...set] };
    });
  }

  async function save() {
    if (!form.name.trim()) {
      toast('Product name is required.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        loan_type: form.loan_type,
        interest_method: form.interest_method,
        min_amount_paise: Number(form.min_amount_paise) || 0,
        max_amount_paise: Number(form.max_amount_paise) || 0,
        min_tenure_months: Number(form.min_tenure_months) || 1,
        max_tenure_months: Number(form.max_tenure_months) || 1,
        annual_interest_rate_bps: Number(form.annual_interest_rate_bps) || 0,
        processing_fee_bps: Number(form.processing_fee_bps) || 0,
        late_fee_bps: Number(form.late_fee_bps) || 0,
        status: form.status,
        required_documents: form.required_documents.map(doc_type => ({
          doc_type,
          required: true,
          check_level: 'content',
          max_files: 1,
        })),
        autopay_required: Boolean(form.autopay_required),
      };
      if (editing === 'new') {
        if (form.product_code.trim()) payload.product_code = form.product_code.trim();
        await api.post('/api/loans/v1/products', payload);
        toast('Loan product created.', 'success');
      } else {
        await api.patch(`/api/loans/v1/products/${encodeURIComponent(editing)}`, payload);
        toast('Loan product updated.', 'success');
      }
      setEditing(null);
      await load();
    } catch (e) {
      toast(e.message || 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Loan Products</h1>
        <Button onClick={openNew}><Plus size={16} aria-hidden /> New product</Button>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      <Card title="Active & inactive products" subtitle="Required documents and AutoPay policy are configured per product.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Code</th>
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Required documents</th>
                <th className="py-2 pr-4">AutoPay required</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.product_code} className="border-t border-slate-100">
                  <td className="py-2 pr-4 font-mono text-xs">{product.product_code}</td>
                  <td className="py-2 pr-4">{product.name}</td>
                  <td className="py-2 pr-4">{product.status}</td>
                  <td className="py-2 pr-4 text-xs">{(product.required_documents || []).map(d => d.doc_type).join(', ') || '—'}</td>
                  <td className="py-2 pr-4">{product.autopay_required ? 'Yes' : 'No'}</td>
                  <td className="py-2 pr-4">
                    <button type="button" onClick={() => openEdit(product)} className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                      <Pencil size={13} aria-hidden /> Edit
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-sm text-slate-500">No loan products yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">{editing === 'new' ? 'New loan product' : `Edit ${editing}`}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {editing === 'new' && (
                <Field label="Product code (optional)">
                  <input className={inputCls} value={form.product_code} onChange={(e) => setForm({ ...form, product_code: e.target.value })} placeholder="LP0001" />
                </Field>
              )}
              <Field label="Name *">
                <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label="Loan type">
                <select className={inputCls} value={form.loan_type} onChange={(e) => setForm({ ...form, loan_type: e.target.value })}>
                  <option value="personal">Personal</option>
                  <option value="business">Business</option>
                  <option value="gold">Gold</option>
                  <option value="vehicle">Vehicle</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Interest method">
                <select className={inputCls} value={form.interest_method} onChange={(e) => setForm({ ...form, interest_method: e.target.value })}>
                  <option value="reducing_balance">Reducing balance</option>
                  <option value="flat">Flat</option>
                </select>
              </Field>
              <Field label="Min amount (paise)">
                <input type="number" className={inputCls} value={form.min_amount_paise} onChange={(e) => setForm({ ...form, min_amount_paise: e.target.value })} />
              </Field>
              <Field label="Max amount (paise)">
                <input type="number" className={inputCls} value={form.max_amount_paise} onChange={(e) => setForm({ ...form, max_amount_paise: e.target.value })} />
              </Field>
              <Field label="Min tenure (months)">
                <input type="number" className={inputCls} value={form.min_tenure_months} onChange={(e) => setForm({ ...form, min_tenure_months: e.target.value })} />
              </Field>
              <Field label="Max tenure (months)">
                <input type="number" className={inputCls} value={form.max_tenure_months} onChange={(e) => setForm({ ...form, max_tenure_months: e.target.value })} />
              </Field>
              <Field label="Annual rate (bps)">
                <input type="number" className={inputCls} value={form.annual_interest_rate_bps} onChange={(e) => setForm({ ...form, annual_interest_rate_bps: e.target.value })} />
              </Field>
              <Field label="Processing fee (bps)">
                <input type="number" className={inputCls} value={form.processing_fee_bps} onChange={(e) => setForm({ ...form, processing_fee_bps: e.target.value })} />
              </Field>
              <Field label="Late fee (bps)">
                <input type="number" className={inputCls} value={form.late_fee_bps} onChange={(e) => setForm({ ...form, late_fee_bps: e.target.value })} />
              </Field>
              <Field label="Status">
                <select className={inputCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
            </div>

            <div className="mt-4">
              <p className="text-sm font-semibold text-slate-800">Required documents</p>
              <p className="text-xs text-slate-500">These drive verification during loan intake. Deactivate the product instead of deleting it.</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {DOC_TYPES.map((doc) => (
                  <label key={doc.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.required_documents.includes(doc.value)}
                      onChange={() => toggleDoc(doc.value)}
                    />
                    {doc.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.autopay_required}
                  onChange={(e) => setForm({ ...form, autopay_required: e.target.checked })}
                />
                Require an active AutoPay mandate before disbursement
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" disabled={saving} onClick={() => setEditing(null)}>Cancel</Button>
              <Button disabled={saving} onClick={save}>
                {saving ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null} Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}