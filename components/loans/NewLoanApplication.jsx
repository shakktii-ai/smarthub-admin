'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, CreditCard, FileText, Loader2, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button, Card, Field, inputCls, cx, Spinner } from '@/components/ui';
import { SearchField } from '@/components/ui/blocks';
import { useApp } from '@/components/ui/AppContext';
import { api } from '@/lib/api/browser';
import DocumentUploadField from './DocumentUploadField';

const steps = [
  { label: 'Borrower', icon: Users, description: 'Identify the borrower and capture KYC identity details.' },
  { label: 'Loan', icon: CreditCard, description: 'Choose an active product and calculate the repayment schedule.' },
  { label: 'Documents', icon: FileText, description: 'Upload the borrower documents an officer will verify by hand.' },
  { label: 'Review', icon: CheckCircle2, description: 'Review everything, then submit the application for manual KYC and approval.' },
];
const fieldSteps = {
  merchant: 0, customerRef: 0, loanRef: 0, name: 0, phone: 0, email: 0, kycRef: 0, address: 0, aadhaar: 0, pan: 0,
  product: 1, amount: 1, tenure: 1, rate: 1, firstDue: 1, preview: 1,
  documents: 2,
  confirmed: 3,
};
const loanFields = new Set(['product', 'amount', 'tenure', 'rate', 'firstDue']);
const initialValues = {
  merchant: '', customerRef: '', loanRef: '', loanRefMode: 'auto', name: '', phone: '', email: '', kycRef: '',
  address: '', aadhaar: '', pan: '',
  product: '', amount: '', tenure: '', rate: '', firstDue: '',
  confirmed: false,
};

// The document kinds the backend accepts. At least one is required; the rest are optional but
// recommended so the reviewing officer can complete manual KYC from the uploaded files.
const DOCUMENT_SLOTS = [
  { docType: 'aadhaar_front', label: 'Aadhaar — front', hint: 'Clear image or PDF of the front of the Aadhaar card.' },
  { docType: 'aadhaar_back', label: 'Aadhaar — back', hint: 'Back of the Aadhaar card, showing the address.' },
  { docType: 'pan_card', label: 'PAN card', hint: 'Image or PDF of the PAN card.' },
  { docType: 'address_proof', label: 'Address proof', hint: 'Utility bill, bank statement or rental agreement.' },
  { docType: 'photo', label: 'Borrower photograph', hint: 'A recent passport-style photograph.' },
  { docType: 'bank_proof', label: 'Bank proof', hint: 'Cancelled cheque or passbook for direct-to-account disbursal.' },
  { docType: 'other', label: 'Other supporting document', hint: 'Any additional document for manual KYC.' },
];
const emptyDocs = () => Object.fromEntries(DOCUMENT_SLOTS.map(slot => [slot.docType, null]));

// A searchable picker over existing merchants. The borrower is usually an individual, so this is
// optional and offers an explicit "no merchant" choice; it never creates a merchant.
const merchantSearch = {
  resource: 'merchants',
  placeholder: 'Search existing merchants by code or name…',
  limit: 20,
  ariaLabel: 'Merchant suggestions',
  toValue: row => row.id,
  toLabel: row => `${row.id} — ${row.name}`,
  toNote: row => [row.category, row.status].filter(Boolean).join(' · '),
  empty: { label: 'No merchant — individual borrower', value: '', note: 'Most borrowers are individuals; leave this blank.' },
};

function hundredths(value) {
  const text = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  const result = Number(`${whole}${fraction.padEnd(2, '0')}`);
  return Number.isSafeInteger(result) ? result : null;
}

function money(paise) {
  return `₹${Math.floor(paise / 100).toLocaleString('en-IN')}.${String(paise % 100).padStart(2, '0')}`;
}

function todayDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function installmentDate(firstDue, offset) {
  if (!validDate(firstDue) || !Number.isInteger(offset) || offset < 0 || offset > 359) return '';
  const [year, month, day] = firstDue.split('-').map(Number);
  const months = year * 12 + month - 1 + offset;
  if (Math.floor(months / 12) > 9999) return '';
  return `${String(Math.floor(months / 12)).padStart(4, '0')}-${String(months % 12 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function methodLabel(method) {
  return method === 'reducing_balance' ? 'Reducing balance' : method === 'flat' ? 'Flat' : method;
}

function ReviewSection({ title, entries }) {
  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <h3 className="mb-3 text-sm font-bold text-slate-900">{title}</h3>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {entries.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="mt-1 whitespace-pre-wrap break-words font-medium text-slate-800">{value || 'Not provided'}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function NewLoanApplication() {
  const router = useRouter();
  const { toast } = useApp();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [docs, setDocs] = useState(emptyDocs);
  // One stable key per application: documents are presigned into its folder before submit, and the
  // same key is sent on submit so a retry without edits replays idempotently.
  const [applicationKey, setApplicationKey] = useState(() => crypto.randomUUID());
  const [exposure, setExposure] = useState({ phone: '', loading: false, error: '', items: [], total: 0 });
  const [products, setProducts] = useState([]);
  const [productState, setProductState] = useState('loading');
  const [productError, setProductError] = useState('');
  const [productLoad, setProductLoad] = useState(0);
  const [preview, setPreview] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const calculationVersion = useRef(0);
  const calculationBusy = useRef(false);
  const submissionBusy = useRef(false);
  const submissionAttempt = useRef(null);
  const summaryRef = useRef(null);
  const headingRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function loadProducts() {
      setProductState('loading');
      setProductError('');
      try {
        const loaded = new Map();
        let offset = 0;
        while (!cancelled) {
          const page = await api.get('/api/loans/v1/products', { status: 'active', limit: 200, offset });
          if (cancelled) return;
          if (!Array.isArray(page?.items) || !Number.isSafeInteger(page.total) || page.total < 0) {
            throw new Error('The product list could not be read. Please retry.');
          }
          const previousSize = loaded.size;
          page.items.forEach(product => loaded.set(product.product_code, product));
          offset += page.items.length;
          if (offset >= page.total) break;
          if (!page.items.length || loaded.size === previousSize) {
            throw new Error('The complete product list could not be loaded. Please retry.');
          }
        }
        if (cancelled) return;
        setProducts([...loaded.values()].filter(product => product.status === 'active').sort((a, b) => a.name.localeCompare(b.name)));
        setProductState('ready');
      } catch (error) {
        if (cancelled) return;
        setProducts([]);
        setProductError(error.message || 'Could not load active loan products.');
        setProductState('error');
      }
    }
    loadProducts();
    return () => { cancelled = true; };
  }, [productLoad]);

  // Read-only exposure check: once the phone is valid, show this borrower's existing loans so the
  // officer sees outstanding debt before lending again. It never blocks submission.
  useEffect(() => {
    const phone = values.phone.trim();
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setExposure({ phone: '', loading: false, error: '', items: [], total: 0 });
      return undefined;
    }
    let live = true;
    setExposure(previous => ({ ...previous, phone, loading: true, error: '' }));
    const timer = setTimeout(() => {
      api.get('/api/loans/v1/loans', { borrower_phone: phone, limit: 50 })
        .then(page => {
          if (!live) return;
          const items = Array.isArray(page?.items) ? page.items : [];
          setExposure({ phone, loading: false, error: '', items, total: Number.isSafeInteger(page?.total) ? page.total : items.length });
        })
        .catch(error => {
          if (live) setExposure({ phone, loading: false, error: error.message || 'Could not check existing loans.', items: [], total: 0 });
        });
    }, 400);
    return () => { live = false; clearTimeout(timer); };
  }, [values.phone]);

  useEffect(() => () => { calculationVersion.current += 1; }, []);
  useEffect(() => { headingRef.current?.focus(); }, [step]);
  useEffect(() => {
    if (Object.keys(errors).length || previewError || submitError) summaryRef.current?.focus();
  }, [errors, previewError, submitError]);

  const product = products.find(item => item.product_code === values.product);
  const documentSlots = useMemo(() => {
    const required = product?.required_documents;
    if (Array.isArray(required) && required.length) {
      return required.map(item => {
        const slot = DOCUMENT_SLOTS.find(s => s.docType === item.doc_type);
        return {
          docType: item.doc_type,
          label: item.label || slot?.label || item.doc_type,
          hint: slot?.hint || (item.required ? 'Required by this product.' : 'Optional for this product.'),
          required: item.required !== false,
          maxFiles: item.max_files || 1,
        };
      });
    }
    return DOCUMENT_SLOTS.map(slot => ({ ...slot, required: false, maxFiles: 1 }));
  }, [product]);
  const principal = hundredths(values.amount);
  const rate = hundredths(values.rate);
  const tenure = /^\d+$/.test(values.tenure.trim()) ? Number(values.tenure) : null;
  const lastDue = installmentDate(values.firstDue, tenure - 1);
  const today = todayDate();
  const uploadedDocs = documentSlots.map(slot => docs[slot.docType]).filter(Boolean);
  useEffect(() => {
    setDocs(Object.fromEntries(documentSlots.map(slot => [slot.docType, null])));
  }, [documentSlots.map(s => s.docType).join(',')]);
  const autoLoanRef = `EXT-${applicationKey.replace(/-/g, '').slice(0, 12).toUpperCase()}`;
  const externalLoanId = values.loanRefMode === 'auto' ? autoLoanRef : values.loanRef.trim();
  const aadhaarTrim = values.aadhaar.trim();
  const panTrim = values.pan.trim().toUpperCase();
  const aadhaarMasked = aadhaarTrim.length === 12 ? `XXXX XXXX ${aadhaarTrim.slice(-4)}` : aadhaarTrim;
  const panMasked = panTrim.length === 10 ? `${panTrim.slice(0, 2)}******${panTrim.slice(-2)}` : panTrim;
  const calculationBody = product ? {
    principal_paise: principal,
    annual_interest_rate_bps: rate,
    tenure_months: tenure,
    interest_method: product.interest_method,
    processing_fee_bps: product.processing_fee_bps,
    first_due_date: values.firstDue,
  } : null;
  const calculationKey = JSON.stringify([values.product, calculationBody]);
  const currentPreview = preview?.key === calculationKey ? preview.data : null;
  const highestInstallment = currentPreview ? Math.max(...currentPreview.schedule.map(item => item.total_paise)) : null;

  // Editing after a submission attempt starts a fresh idempotency key, so a corrected application
  // is not rejected as a changed-body replay of the previous key. Already-uploaded documents keep
  // their absolute storage keys, which remain valid regardless of the folder they were signed into.
  function invalidateSubmission() {
    if (submissionAttempt.current) {
      submissionAttempt.current = null;
      setApplicationKey(crypto.randomUUID());
    }
  }

  function changeValue(name, value) {
    if (submissionBusy.current) return;
    invalidateSubmission();
    setSubmitError('');
    setPreviewError('');
    setErrors({});
    const changes = { [name]: value };
    if (name === 'product') {
      const selected = products.find(item => item.product_code === value);
      changes.rate = selected ? (selected.annual_interest_rate_bps / 100).toFixed(2) : '';
    }
    if (name !== 'confirmed') changes.confirmed = false;
    if (loanFields.has(name)) {
      calculationVersion.current += 1;
      calculationBusy.current = false;
      setCalculating(false);
      setPreview(null);
    }
    setValues(previous => ({ ...previous, ...changes }));
  }

  function changeDoc(docType, doc) {
    if (submissionBusy.current) return;
    invalidateSubmission();
    setSubmitError('');
    setErrors({});
    setValues(previous => ({ ...previous, confirmed: false }));
    setDocs(previous => ({ ...previous, [docType]: doc }));
  }

  function validateStep(index, requirePreview = true) {
    const result = {};
    const requiredText = (name, label, max) => {
      if (!values[name].trim()) result[name] = `${label} is required.`;
      else if (values[name].trim().length > max) result[name] = `${label} must be ${max} characters or fewer.`;
    };
    if (index === 0) {
      requiredText('name', 'Customer name', 255);
      if (!/^[6-9]\d{9}$/.test(values.phone.trim())) result.phone = 'Phone must contain 10 digits starting with 6, 7, 8 or 9.';
      if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) result.email = 'Enter a valid email address, or leave it blank.';
      requiredText('address', 'Borrower address', 500);
      if (!/^[2-9]\d{11}$/.test(aadhaarTrim)) result.aadhaar = 'Aadhaar must be 12 digits starting with 2–9.';
      if (!/^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/.test(values.pan.trim())) result.pan = 'PAN must be 10 characters, e.g. ABCDE1234F.';
      if (values.merchant.trim().length > 40) result.merchant = 'Merchant code must be 40 characters or fewer.';
      if (values.customerRef.trim().length > 100) result.customerRef = 'External customer reference must be 100 characters or fewer.';
      if (values.kycRef.trim().length > 100) result.kycRef = 'KYC reference must be 100 characters or fewer.';
      if (values.loanRefMode === 'manual') requiredText('loanRef', 'External loan reference', 100);
    }
    if (index === 1) {
      if (productState !== 'ready' || !product) result.product = 'Select an active product from the loaded list.';
      if (principal === null || principal <= 0) result.amount = 'Enter a positive INR amount with at most 2 decimal places, within the safe paise limit.';
      else if (product && principal < product.min_amount_paise) result.amount = `This product requires at least ${money(product.min_amount_paise)}.`;
      else if (product?.max_amount_paise > 0 && principal > product.max_amount_paise) result.amount = `This product allows up to ${money(product.max_amount_paise)}.`;
      const minTenure = Math.max(1, product?.min_tenure_months ?? 1);
      const maxTenure = Math.min(360, product?.max_tenure_months ?? 360);
      if (!Number.isInteger(tenure) || tenure < minTenure || tenure > maxTenure) result.tenure = `Tenure must be a whole number from ${minTenure} to ${maxTenure} months.`;
      if (rate === null || rate < 0 || rate > 100000) result.rate = 'Annual interest must be 0–1000%, with at most 2 decimal places.';
      if (!validDate(values.firstDue)) result.firstDue = 'Choose a valid first EMI date.';
      else if (values.firstDue < todayDate()) result.firstDue = 'First EMI date must be today or in the future.';
      else if (Number(values.firstDue.slice(-2)) > 28) result.firstDue = 'Choose day 1–28 for the monthly repayment schedule.';
      else if (!result.tenure && !lastDue) result.firstDue = 'Choose a first EMI date whose full schedule fits within year 9999.';
      if (requirePreview && !currentPreview) result.preview = 'Calculate the current loan terms before continuing.';
    }
    if (index === 2) {
      if (uploadedDocs.length === 0) result.documents = 'Upload at least one borrower document for manual KYC verification.';
    }
    if (index === 3 && !values.confirmed) result.confirmed = 'Confirm that the application details are accurate before submitting.';
    return result;
  }

  async function calculate() {
    if (submissionBusy.current || calculationBusy.current) return;
    const nextErrors = validateStep(1, false);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const version = ++calculationVersion.current;
    calculationBusy.current = true;
    setCalculating(true);
    setPreviewError('');
    setPreview(null);
    try {
      const data = await api.post('/api/loans/v1/emi-calculator', calculationBody);
      if (version !== calculationVersion.current) return;
      const totals = ['emi_paise', 'total_interest_paise', 'total_payable_paise', 'processing_fee_paise', 'net_disbursal_paise'];
      if (!totals.every(key => Number.isSafeInteger(data?.[key]) && data[key] >= 0)
        || !Array.isArray(data?.schedule) || data.schedule.length !== tenure
        || !data.schedule.every((item, index) => Number.isSafeInteger(item.total_paise) && item.total_paise >= 0
          && item.due_date === installmentDate(values.firstDue, index))) {
        throw new Error('The calculator returned an incomplete, unsafe, or mismatched schedule. Check the terms and retry; a current schedule is required.');
      }
      setPreview({ key: calculationKey, data });
    } catch (error) {
      if (version === calculationVersion.current) setPreviewError(error.message || 'Could not calculate the repayment schedule. Please retry.');
    } finally {
      if (version === calculationVersion.current) {
        calculationBusy.current = false;
        setCalculating(false);
      }
    }
  }

  function next() {
    if (submissionBusy.current || calculationBusy.current) return;
    const nextErrors = validateStep(step);
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) setStep(Math.min(step + 1, steps.length - 1));
  }

  function previous() {
    if (submissionBusy.current) return;
    setErrors({});
    setStep(index => Math.max(0, index - 1));
  }

  async function submit() {
    if (submissionBusy.current) return;
    const nextErrors = Object.assign({}, ...steps.map((_, index) => validateStep(index)));
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setStep(Math.min(...Object.keys(nextErrors).map(name => fieldSteps[name])));
      return;
    }
    submissionBusy.current = true;
    setSubmitting(true);
    setSubmitError('');
    try {
      if (!submissionAttempt.current) {
        submissionAttempt.current = {
          application_key: applicationKey,
          product_code: values.product,
          borrower_name: values.name.trim(),
          borrower_phone: values.phone.trim(),
          borrower_email: values.email.trim() || null,
          merchant_code: values.merchant.trim() || null,
          principal_paise: principal,
          annual_interest_rate_bps: rate,
          tenure_months: tenure,
          application_details: {
            external_customer_id: values.customerRef.trim() || null,
            external_loan_id: externalLoanId,
            borrower_address: values.address.trim(),
            pan: panTrim,
            aadhaar: aadhaarTrim,
            first_due_date: values.firstDue,
            kyc_reference: values.kycRef.trim() || null,
            documents: uploadedDocs.map(doc => ({
              doc_type: doc.doc_type,
              storage_key: doc.storage_key,
              file_name: doc.file_name,
              content_type: doc.content_type,
            })),
            details_confirmed: true,
          },
        };
      }
      const result = await api.post('/api/loans/v1/applications', submissionAttempt.current);
      if (!result?.loan_ref) throw new Error('No application reference was returned. Retry without editing to safely check the same submission.');
      toast(`Loan application submitted for review: ${result.loan_ref}`);
      router.push('/collection-admin/loans/applications');
      router.refresh();
    } catch (error) {
      const message = error.message || 'Could not submit the application.';
      setSubmitError(message);
      toast(message, 'error');
      submissionBusy.current = false;
      setSubmitting(false);
    }
  }

  function focusField(name) {
    if (submissionBusy.current) return;
    setStep(fieldSteps[name]);
    requestAnimationFrame(() => document.getElementById(`application-${name}`)?.focus());
  }

  function control(name) {
    return {
      id: `application-${name}`,
      name,
      className: inputCls,
      value: values[name],
      onChange: event => changeValue(name, event.target.value),
      'aria-invalid': Boolean(errors[name]),
      'aria-describedby': errors[name] ? `application-${name}-error` : undefined,
      disabled: submitting,
    };
  }

  const fieldError = name => errors[name] ? <span id={`application-${name}-error`}>{errors[name]}</span> : undefined;
  const StepIcon = steps[step].icon;
  const hasErrors = Object.keys(errors).length > 0 || previewError || submitError;
  const phoneValid = /^[6-9]\d{9}$/.test(values.phone.trim());

  const exposurePanel = phoneValid && (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4" aria-label="Existing loans for this borrower" aria-live="polite">
      <h3 className="text-sm font-bold text-slate-900">Existing loans for this phone</h3>
      {exposure.loading ? <p className="mt-2 text-xs text-slate-500">Checking existing loans…</p>
        : exposure.error ? <p className="mt-2 text-xs text-amber-700">Could not check existing loans: {exposure.error}. You can still continue.</p>
        : exposure.items.length === 0 ? <p className="mt-2 text-xs text-slate-600">No existing loans found for {values.phone.trim()}. This appears to be a new borrower.</p>
        : (
          <div className="mt-2">
            <p className="text-xs text-slate-600">{exposure.total} existing loan{exposure.total === 1 ? '' : 's'} found. Review the exposure before lending again.</p>
            <ul className="mt-2 space-y-1.5">
              {exposure.items.map(item => (
                <li key={item.loan_ref} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-white px-3 py-2 text-xs">
                  <span className="font-mono font-semibold text-slate-800">{item.loan_ref}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">{String(item.status).replace(/_/g, ' ')}</span>
                  <span className="text-slate-500">Principal {money(item.principal_paise)}</span>
                  <span className="text-slate-500">Outstanding {money(item.outstanding_principal_paise)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
    </section>
  );

  const repaymentSummary = currentPreview && (
    <section className="rounded-xl border border-blue-100 bg-blue-50/50 p-4" aria-label="Calculated repayment summary">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900">Calculated repayment</h3>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700"><CheckCircle2 size={14} aria-hidden /> Current terms</span>
      </div>
      <dl className="mt-4 grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 lg:grid-cols-3">
        {[
          ['Monthly EMI', money(currentPreview.emi_paise)],
          ['Highest installment', money(highestInstallment)],
          ['Total interest', money(currentPreview.total_interest_paise)],
          ['Total payable (installments)', money(currentPreview.total_payable_paise)],
          ['Processing fee', money(currentPreview.processing_fee_paise)],
          ['Net disbursal', money(currentPreview.net_disbursal_paise)],
        ].map(([label, value]) => (
          <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words text-base font-bold tabular-nums text-slate-900">{value}</dd></div>
        ))}
      </dl>
      <p className="mt-4 text-xs leading-relaxed text-slate-600">Monthly from {values.firstDue} through {lastDue}. The final installment can differ due to rounding. Calculated amounts are not loan approval or a disbursal commitment.</p>
      <details className="mt-3">
        <summary className="cursor-pointer rounded text-sm font-semibold text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">View all {tenure} installments</summary>
        <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-blue-100" role="region" aria-label="Monthly installment schedule" tabIndex={0}>
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Calculated monthly installment schedule, including final rounding</caption>
            <thead className="sticky top-0 bg-slate-100 text-slate-600"><tr><th scope="col" className="px-3 py-2">Installment</th><th scope="col" className="px-3 py-2">Due date</th><th scope="col" className="px-3 py-2 text-right">Amount</th></tr></thead>
            <tbody className="divide-y divide-blue-100 bg-white">
              {currentPreview.schedule.map((item, index) => <tr key={index}><th scope="row" className="px-3 py-2 font-medium">{index + 1}</th><td className="whitespace-nowrap px-3 py-2">{item.due_date}</td><td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{money(item.total_paise)}</td></tr>)}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <Button variant="outline" disabled={submitting} onClick={() => {
          if (submissionBusy.current) return;
          const dirty = Object.keys(initialValues).some(name => values[name] !== initialValues[name]) || uploadedDocs.length > 0;
          if (!dirty || window.confirm('Leave this form? Unsaved application details and uploaded documents will be lost.')) router.push('/collection-admin/loans/applications');
        }}><ArrowLeft size={16} aria-hidden /> Applications</Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">New Loan Application</h1>
          <p className="mt-1 text-sm text-slate-500">Capture the borrower and loan details, then submit for review. An administrator verifies KYC, approves and disburses — AutoPay is set up afterwards, via the collect app.</p>
        </div>
      </div>

      <Card>
        <nav aria-label="Application progress">
          <ol className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {steps.map((item, index) => (
              <li key={item.label} aria-current={index === step ? 'step' : undefined} className="flex items-center gap-2">
                <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold', index < step ? 'bg-emerald-50 text-emerald-700' : index === step ? 'bg-brand text-white shadow-sm' : 'bg-slate-100 text-slate-500')}>
                  {index < step ? <CheckCircle2 size={18} aria-hidden /> : index + 1}
                </span>
                <span className={cx('text-xs sm:text-sm', index === step ? 'font-bold text-slate-900' : 'font-medium text-slate-500')}>{item.label}</span>
              </li>
            ))}
          </ol>
        </nav>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-slate-100" aria-hidden><div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
      </Card>

      <Card>
        <form noValidate aria-busy={submitting} onSubmit={event => { event.preventDefault(); if (step === steps.length - 1) submit(); else next(); }}>
          <fieldset disabled={submitting} className="min-w-0 space-y-6">
            <legend className="sr-only">New loan application</legend>
            <div className="flex items-start gap-3 border-b border-slate-100 pb-5">
              <span className="rounded-xl bg-blue-50 p-2.5 text-brand"><StepIcon size={21} aria-hidden /></span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Step {step + 1} of {steps.length}</p>
                <h2 ref={headingRef} tabIndex={-1} className="mt-1 text-lg font-bold text-slate-900 focus:outline-none">{steps[step].label}</h2>
                <p className="mt-1 text-sm text-slate-500">{steps[step].description} {step < steps.length - 1 && 'Fields marked * are required.'}</p>
              </div>
            </div>

            {hasErrors && (
              <div ref={summaryRef} tabIndex={-1} role="alert" aria-labelledby="application-error-title" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 focus:outline focus:outline-2 focus:outline-red-500">
                <h3 id="application-error-title" className="font-bold">Please check the application</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {Object.entries(errors).map(([name, message]) => <li key={name}><button type="button" disabled={submitting} className="text-left underline underline-offset-2" onClick={() => focusField(name)}>{steps[fieldSteps[name]].label}: {message}</button></li>)}
                  {previewError && <li>Repayment calculation: {previewError}</li>}
                  {submitError && <li className="break-words">Submission: {submitError}</li>}
                </ul>
                {submitError && <p className="mt-3">Your entries are retained. Retry without editing to reuse the same submission key. Editing creates a new submission attempt.</p>}
              </div>
            )}

            {step === 0 && (
              <div className="space-y-5">
                <div className="grid gap-x-5 gap-y-1 sm:grid-cols-2">
                  <Field label="Customer full name *" error={fieldError('name')}><input {...control('name')} required maxLength={255} autoComplete="name" placeholder="Full legal name" /></Field>
                  <Field label="Customer phone *" error={fieldError('phone')} hint="10 digits, starting with 6–9; no country code."><input {...control('phone')} required type="tel" inputMode="numeric" maxLength={10} autoComplete="tel-national" placeholder="9876543210" /></Field>
                  <Field label="Customer email (optional)" error={fieldError('email')}><input {...control('email')} type="email" autoComplete="email" placeholder="customer@example.com" /></Field>
                  <Field label="Merchant (optional)" error={fieldError('merchant')} hint="Search existing merchants. Leave blank for an individual borrower.">
                    <SearchField field={{ label: 'Merchant', search: merchantSearch }} value={values.merchant} onValue={val => changeValue('merchant', val)} />
                  </Field>
                </div>
                {exposurePanel}
                <Field label="Borrower address *" error={fieldError('address')} hint="Full residential address, as shown on the address proof.">
                  <textarea {...control('address')} required rows={3} maxLength={500} placeholder="House / street, area, city, state, PIN" />
                </Field>
                <div className="grid gap-x-5 gap-y-1 sm:grid-cols-2">
                  <Field label="Aadhaar number *" error={fieldError('aadhaar')} hint="12 digits. Stored masked (last 4 only); the full number is read from your uploaded document during KYC."><input {...control('aadhaar')} required inputMode="numeric" maxLength={12} autoComplete="off" placeholder="123456789012" /></Field>
                  <Field label="PAN *" error={fieldError('pan')} hint="10 characters, e.g. ABCDE1234F. Masked in the dashboard."><input {...control('pan')} required maxLength={10} autoComplete="off" placeholder="ABCDE1234F" style={{ textTransform: 'uppercase' }} /></Field>
                </div>
                <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="grid gap-x-5 gap-y-1 sm:grid-cols-2">
                    <Field label="External customer reference (optional)" error={fieldError('customerRef')}><input {...control('customerRef')} maxLength={100} autoComplete="off" placeholder="Customer ID in your source system" /></Field>
                    <Field label="KYC case / evidence reference (optional)" error={fieldError('kycRef')}><input {...control('kycRef')} maxLength={100} autoComplete="off" placeholder="Existing secure KYC case reference" /></Field>
                  </div>
                  <fieldset>
                    <legend className="mb-2 text-sm font-semibold text-slate-700">Loan reference</legend>
                    <div className="flex flex-wrap gap-3">
                      {[['auto', 'Auto-generate'], ['manual', 'Enter manually']].map(([value, label]) => (
                        <label key={value} className={cx('flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition', values.loanRefMode === value ? 'border-brand bg-blue-50/60 ring-1 ring-brand' : 'border-slate-200 hover:bg-white')}>
                          <input type="radio" name="loanRefMode" value={value} checked={values.loanRefMode === value} onChange={() => changeValue('loanRefMode', value)} disabled={submitting} className="accent-blue-600" />
                          <span className="font-medium text-slate-700">{label}</span>
                        </label>
                      ))}
                    </div>
                    {values.loanRefMode === 'auto'
                      ? <p className="mt-2 text-xs text-slate-600">Reference to be saved: <strong className="font-mono">{autoLoanRef}</strong></p>
                      : <div className="mt-3"><Field label="External loan reference *" error={fieldError('loanRef')}><input {...control('loanRef')} required maxLength={100} autoComplete="off" placeholder="Loan ID in your source system" /></Field></div>}
                  </fieldset>
                </section>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-5">
                {productState === 'loading' ? <Spinner /> : productState === 'error' ? (
                  <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p className="mb-3">{productError}</p><Button variant="outline" disabled={submitting} onClick={() => setProductLoad(value => value + 1)}>Retry loading products</Button></div>
                ) : products.length === 0 ? (
                  <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="mb-3">No active loan products are available. Ask an administrator to activate a product, then retry.</p><Button variant="outline" disabled={submitting} onClick={() => setProductLoad(value => value + 1)}>Reload active products</Button></div>
                ) : null}
                <Field label="Loan product *" error={fieldError('product')}>
                  <select {...control('product')} required disabled={submitting || productState !== 'ready' || !products.length}>
                    <option value="">Select an active product</option>
                    {products.map(item => <option key={item.product_code} value={item.product_code}>{item.name} — {item.product_code}</option>)}
                  </select>
                </Field>
                {product && <div className="grid gap-2 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-600 sm:grid-cols-2">
                  <p><strong>Amount:</strong> {product.min_amount_paise > 0 ? money(product.min_amount_paise) : 'Greater than ₹0.00'} to {product.max_amount_paise > 0 ? money(product.max_amount_paise) : 'no product upper limit'}</p>
                  <p><strong>Tenure:</strong> {product.min_tenure_months}–{product.max_tenure_months} months</p>
                  <p><strong>Interest method:</strong> {methodLabel(product.interest_method)}</p>
                  <p><strong>Processing fee:</strong> {(product.processing_fee_bps / 100).toFixed(2)}% of principal</p>
                </div>}
                <div className="grid gap-x-5 gap-y-1 sm:grid-cols-2">
                  <Field label="Loan amount (INR) *" error={fieldError('amount')} hint="Up to 2 decimal places. Do not include commas or currency symbols."><input {...control('amount')} required inputMode="decimal" placeholder="100000.00" /></Field>
                  <Field label="Tenure (months) *" error={fieldError('tenure')} hint="Whole months, within the selected product’s limits."><input {...control('tenure')} required inputMode="numeric" placeholder="24" /></Field>
                  <Field label="Annual interest rate (%) *" error={fieldError('rate')} hint="Defaults to the product rate; editable from 0 to 1000%, up to 2 decimals."><input {...control('rate')} required inputMode="decimal" placeholder="12.00" /></Field>
                  <Field label="First EMI date *" error={fieldError('firstDue')} hint="Today or later, on day 1–28. Repayments are monthly."><input {...control('firstDue')} required type="date" min={today} /></Field>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button id="application-preview" variant="outline" disabled={submitting || calculating || !product} onClick={calculate} aria-describedby={errors.preview ? 'application-preview-error' : undefined}>
                    {calculating ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <CreditCard size={16} aria-hidden />}
                    {calculating ? 'Calculating…' : currentPreview ? 'Recalculate repayment' : 'Calculate repayment'}
                  </Button>
                  <p className="text-xs text-slate-500" role="status">{calculating ? 'Fetching the schedule for these terms.' : currentPreview ? 'Calculated using the loan API.' : 'Calculate before continuing. Changing loan terms clears the previous calculation.'}</p>
                </div>
                {errors.preview && <p id="application-preview-error" className="text-xs text-red-600">{errors.preview}</p>}
                {repaymentSummary}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-xs leading-relaxed text-slate-700">
                  <p className="font-semibold text-slate-900">Manual KYC documents</p>
                  <p className="mt-1">There is no automated KYC provider yet, so an officer verifies these documents by hand. Upload at least one; Aadhaar (front and back) and PAN are strongly recommended. Files go directly to secure storage — PNG, JPEG, WebP or PDF, up to 8 MB each.</p>
                </div>
                {errors.documents && <p role="alert" className="text-xs text-red-600">{errors.documents}</p>}
                <div id="application-documents" tabIndex={-1} className="grid gap-4 focus:outline-none sm:grid-cols-2">
                  {documentSlots.map(slot => (
                    <DocumentUploadField
                      key={slot.docType}
                      label={slot.required ? `${slot.label} *` : slot.label}
                      hint={slot.hint}
                      docType={slot.docType}
                      applicationKey={applicationKey}
                      value={docs[slot.docType]}
                      onValue={doc => changeDoc(slot.docType, doc)}
                      disabled={submitting}
                      expectedPan={values.pan.trim().toUpperCase()}
                      expectedAadhaar={values.aadhaar.trim().slice(-4)}
                    />
                  ))}
                </div>
                <p className="text-xs text-slate-500">{uploadedDocs.length} document{uploadedDocs.length === 1 ? '' : 's'} attached. The full Aadhaar and PAN are read from these files during review; only masked forms are shown in the dashboard.</p>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <ReviewSection title="Borrower and identity" entries={[
                  ['Customer full name', values.name.trim()], ['Customer phone', values.phone.trim()],
                  ['Customer email', values.email.trim()], ['Merchant', values.merchant.trim() || 'Individual borrower (no merchant)'],
                  ['Borrower address', values.address.trim()],
                  ['Aadhaar (masked)', aadhaarMasked], ['PAN (masked)', panMasked],
                  ['External customer reference', values.customerRef.trim()],
                  ['KYC case / evidence reference', values.kycRef.trim()], ['Loan reference', externalLoanId],
                ]} />
                <p className="text-xs text-slate-500">Aadhaar and PAN are shown masked. The reviewing officer reads the full numbers from the uploaded documents during manual KYC.</p>
                <ReviewSection title="Chosen loan terms" entries={[
                  ['Product', product ? `${product.name} — ${product.product_code}` : values.product],
                  ['Principal', principal !== null ? money(principal) : values.amount],
                  ['Tenure', `${tenure} months`], ['Annual interest rate', rate !== null ? `${(rate / 100).toFixed(2)}%` : values.rate],
                  ['Interest method', methodLabel(product?.interest_method)],
                  ['Processing fee rate', product ? `${(product.processing_fee_bps / 100).toFixed(2)}%` : ''],
                  ['First EMI date', values.firstDue], ['Last installment date', lastDue], ['Repayment frequency', 'Monthly'],
                ]} />
                {repaymentSummary}
                <section className="rounded-xl border border-slate-200 p-4">
                  <h3 className="mb-3 text-sm font-bold text-slate-900">KYC documents ({uploadedDocs.length})</h3>
                  <ul className="space-y-2 text-sm">
                    {uploadedDocs.map(doc => {
                      const slot = DOCUMENT_SLOTS.find(item => item.docType === doc.doc_type);
                      return (
                        <li key={doc.storage_key} className="flex items-center gap-2">
                          <FileText size={15} className="shrink-0 text-slate-400" aria-hidden />
                          <span className="font-medium text-slate-800">{slot?.label || doc.doc_type}</span>
                          <span className="min-w-0 truncate text-slate-500">{doc.file_name}</span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">Submitting sends this application for manual KYC verification and review only. An administrator verifies the documents, approves, then disburses manually — by cash or directly to the borrower’s account. AutoPay is set up after approval, during or after disbursement, via the collect app; no mandate is created or authorized by this form.</div>
                <Field label="Details confirmation *" error={fieldError('confirmed')}>
                  <span className="mt-2 flex items-start gap-3 rounded-xl border border-slate-200 p-4">
                    <input id="application-confirmed" type="checkbox" checked={values.confirmed} onChange={event => changeValue('confirmed', event.target.checked)} disabled={submitting} required aria-invalid={Boolean(errors.confirmed)} aria-describedby={errors.confirmed ? 'application-confirmed-error' : undefined} className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600" />
                    <span className="text-sm font-normal leading-relaxed text-slate-700">I confirm that the application details above are accurate. This confirms details only; it is not customer authorization for a mandate or debit, and does not verify KYC.</span>
                  </span>
                </Field>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <Button variant="outline" disabled={step === 0 || submitting} onClick={previous}><ArrowLeft size={16} aria-hidden /> Previous</Button>
              {step < steps.length - 1 ? <Button type="submit" disabled={submitting || calculating}>Next: {steps[step + 1].label} <ArrowRight size={16} aria-hidden /></Button> : (
                <Button type="submit" disabled={submitting} className="bg-gradient-to-b from-[#1E9E6A] to-[#168A5A]">
                  {submitting && <Loader2 size={16} className="animate-spin" aria-hidden />}
                  {submitting ? 'Submitting application…' : submitError ? 'Retry submission' : 'Submit for review'}
                </Button>
              )}
            </div>
          </fieldset>
          <p className="sr-only" role="status">{submitting ? 'Submitting application. Please wait; form controls are disabled.' : ''}</p>
        </form>
      </Card>
    </div>
  );
}