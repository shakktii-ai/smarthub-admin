'use client';

import { useRef, useState } from 'react';
import { CheckCircle2, FileText, Loader2 } from 'lucide-react';
import { inputCls } from '@/components/ui';
import { api } from '@/lib/api/browser';

const MAX_MB = 8;
const ACCEPT = 'application/pdf,image/jpeg,image/png';
const ACCEPT_EXT = '.pdf,.jpg,.jpeg,.png';

// One application document. The backend signs an upload scoped to this application's folder,
// the browser sends the bytes straight to storage (S3 multipart POST or a memory PUT), and the
// returned key is what gets saved on the application. No file ever passes through the API server.
export default function DocumentUploadField({ label, hint, docType, applicationKey, value, onValue, disabled, expectedPan, expectedAadhaar }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  async function pick(file) {
    if (!file || busy) return;
    setError('');
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`${file.name} is ${Math.round(file.size / 1048576)} MB — the limit is ${MAX_MB} MB.`);
      return;
    }
    const contentType = file.type || 'application/octet-stream';
    setBusy(true);
    try {
      const presign = await api.post('/api/loans/v1/documents/presign', {
        application_key: applicationKey,
        doc_type: docType,
        filename: file.name,
        content_type: contentType,
      });
      if (!presign?.key || !presign?.upload_url) throw new Error('The upload could not be prepared. Please retry.');
      let res;
      if (presign.method === 'POST') {
        const form = new FormData();
        Object.entries(presign.fields || {}).forEach(([k, v]) => form.append(k, v));
        form.append('file', file);
        res = await fetch(presign.upload_url, { method: 'POST', body: form });
      } else {
        res = await fetch(presign.upload_url, { method: presign.method || 'PUT', headers: presign.headers || {}, body: file });
      }
      if (!res.ok) throw new Error(`The storage upload failed (${res.status}). Please retry.`);
      // Advisory pre-check. Submission re-runs the same verifier, so this is only
      // for operator feedback. Never gate on its result here.
      let verification = null;
      try {
        verification = await api.post('/api/loans/v1/documents/verify', {
          application_key: applicationKey,
          storage_key: presign.key,
          doc_type: docType,
          expected_pan: expectedPan || undefined,
          expected_aadhaar_last4: expectedAadhaar || undefined,
          check_level: 'content',
        });
      } catch (e) {
        verification = null;
      }
      onValue({ doc_type: docType, storage_key: presign.key, file_name: file.name, content_type: contentType, verification });
    } catch (e) {
      setError(e.message || 'Upload failed.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800">{label}</p>
          {hint && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{hint}</p>}
        </div>
        {value && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 size={13} aria-hidden /> Uploaded
          </span>
        )}
      </div>
      {value ? (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <FileText size={16} className="shrink-0 text-slate-400" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-slate-700">{value.file_name}</span>
          {value.verification && (
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              value.verification.status === 'passed' ? 'bg-emerald-50 text-emerald-700'
                : value.verification.status === 'failed' ? 'bg-red-50 text-red-700'
                : 'bg-amber-50 text-amber-700'
            }`}>
              {value.verification.status === 'passed' ? 'Checks passed'
                : value.verification.status === 'failed' ? 'Check failed'
                : 'Needs review'}
            </span>
          )}
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => { onValue(null); setError(''); }}
            className="shrink-0 rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 transition hover:border-red-300 hover:text-red-600 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      ) : (
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          disabled={disabled || busy}
          className={inputCls}
          onChange={(e) => pick(e.target.files[0])}
          aria-label={label}
        />
      )}
      {busy && <p className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500"><Loader2 size={13} className="animate-spin" aria-hidden /> Uploading…</p>}
      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}