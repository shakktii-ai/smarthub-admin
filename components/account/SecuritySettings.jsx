'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  KeyRound,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import { Button, Card, Field, cx, inputCls } from '@/components/ui';
import { useApp } from '@/components/ui/AppContext';
import { utcDate } from '@/lib/api/labels';
import {
  disableAuthenticator,
  enableAuthenticator,
  replaceRecoveryCodes,
  startSetup,
} from '@/app/account/security/actions';

const enrolledOn = (value) => {
  const d = utcDate(value);
  return d ? d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : null;
};

// The codes are returned once, by the endpoint that turns MFA on. Keeping them in component
// state is the only copy that will ever exist, so leaving the screen loses them.
function RecoveryCodes({ codes, onDone }) {
  const { toast } = useApp();
  const [copied, setCopied] = useState(false);

  const text = codes.join('\n');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast('Recovery codes copied.');
    } catch {
      toast('Your browser blocked the clipboard. Use Download instead.', 'error');
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([`${text}\n`], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'smarthubpay-recovery-codes.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
      <p className="mb-1 text-sm font-semibold text-emerald-900">
        Save these {codes.length} recovery codes now
      </p>
      <p className="mb-3 text-xs leading-5 text-emerald-800">
        Each one works once if you lose your phone. They are shown this single time and cannot be
        retrieved afterwards.
      </p>

      <div className="mb-3 grid grid-cols-2 gap-1 rounded-md border border-emerald-200 bg-white p-3 font-mono text-sm sm:grid-cols-3">
        {codes.map((code) => (
          <span key={code} className="whitespace-nowrap">
            {code}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={copy}>
          {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button variant="outline" onClick={download}>
          <Download size={15} aria-hidden />
          Download
        </Button>
        <Button onClick={onDone}>Done</Button>
      </div>
    </div>
  );
}

function CodeField({
  label = 'Authenticator code',
  hint,
  recovery = false,
  ...input
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        {...input}
        type="text"
        // A recovery code is alphanumeric with a dash, so the field that takes one must not
        // narrow the keyboard to digits.
        inputMode={recovery ? 'text' : 'numeric'}
        autoComplete={recovery ? 'off' : 'one-time-code'}
        maxLength={12}
        required
        className={cx(
          inputCls,
          'tracking-[0.2em]',
          recovery && 'font-mono tracking-normal',
        )}
      />
    </Field>
  );
}

export default function SecuritySettings({ data }) {
  const router = useRouter();
  const { toast } = useApp();

  const [setup, setSetup] = useState(null);
  const [codes, setCodes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Wizard states are separate on purpose: each one asks the backend for a different proof.
  const [disableForm, setDisableForm] = useState({ password: '', code: '' });
  const [renewForm, setRenewForm] = useState({ password: '', code: '' });

  const begin = async () => {
    setBusy(true);
    setError('');
    const res = await startSetup();
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setSetup(res);
  };

  const verify = async (event) => {
    event.preventDefault();
    const code = new FormData(event.currentTarget).get('code');
    setBusy(true);
    const res = await enableAuthenticator(code);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setSetup(null);
    setCodes(res.recoveryCodes);
    toast('Authenticator enabled.');
    router.refresh();
  };

  const disable = async (event) => {
    event.preventDefault();
    setBusy(true);
    const res = await disableAuthenticator(disableForm.password, disableForm.code);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setDisableForm({ password: '', code: '' });
    toast('Authenticator removed from this account.');
    router.refresh();
  };

  const renew = async (event) => {
    event.preventDefault();
    setBusy(true);
    const res = await replaceRecoveryCodes(renewForm.password, renewForm.code);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setRenewForm({ password: '', code: '' });
    setCodes(res.recoveryCodes);
    router.refresh();
  };

  const cancel = () => {
    setSetup(null);
    setError('');
  };

  const enabled = Boolean(data?.enabled);
  const enrolled = enrolledOn(data?.enrolledAt);

  // Nothing can be enrolled against a status we could not read, so the screen stops here
  // rather than offering controls that would fail on submit.
  if (data?.error) {
    return (
      <>
        <h1 className="text-2xl font-bold">Security &amp; two-factor</h1>
        <Card>
          <div className="flex flex-col items-start gap-3 p-2">
            <p role="alert" className="flex items-start gap-2 text-sm text-red-700">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
              Could not load your security settings: {data.error}
            </p>
            <Button variant="outline" onClick={() => router.refresh()}>
              Try again
            </Button>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">Security &amp; two-factor</h1>
        <p className="text-sm text-slate-600">
          Everything on this page applies to your own sign-in. Only you can change it, and every
          change is written to the audit trail.
        </p>
      </div>

      {error && (
        <Card>
          <div role="alert" className="flex items-start gap-3 text-sm text-red-700">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        </Card>
      )}

      <Card title="Authenticator app">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck size={17} className={enabled ? 'text-emerald-600' : 'text-slate-400'} aria-hidden />
              {enabled ? 'Two-factor is on' : 'Two-factor is off'}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {enabled
                ? `Enrolled ${enrolled || 'earlier'} · ${data?.recoveryCodesRemaining || 0} recovery codes left.`
                : 'Your password is the only thing standing between this account and the platform.'}
            </p>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {data?.requiredByPolicy
                ? 'This platform currently requires every administrator to keep an authenticator enabled, so sign-in is refused until one is set up.'
                : 'The platform does not require an authenticator right now. Turning one on is still the recommended setting.'}
            </p>
          </div>

          {!enabled && !setup && !codes && (
            <Button onClick={begin} disabled={busy}>
              <Smartphone size={16} aria-hidden />
              {busy ? 'Preparing…' : 'Set up authenticator'}
            </Button>
          )}
        </div>
      </Card>

      {setup && (
        <Card title="Scan, then confirm">
          <ol className="mb-4 space-y-2 text-sm text-slate-700">
            <li>
              <span className="font-semibold">1.</span> Open Google Authenticator, Authy or 1Password
              and choose “Add account”.
            </li>
            <li>
              <span className="font-semibold">2.</span> Scan the code below, or enter the setup key by
              hand.
            </li>
            <li>
              <span className="font-semibold">3.</span> Type the 6 digits it shows to finish. The
              account stays unprotected until you do.
            </li>
          </ol>

          <div className="flex flex-col gap-5 sm:flex-row">
            <div className="shrink-0 rounded-lg border border-slate-200 bg-white p-3">
              {/* The API renders this QR itself and it never leaves our session: an authenticator
                  key sent to a third-party image service is a key handed to that service. */}
              <img
                src={`data:image/svg+xml,${encodeURIComponent(setup.qrSvg)}`}
                alt={`QR code for ${setup.account}`}
                width={188}
                height={188}
                className="h-[188px] w-[188px]"
              />
            </div>

            <div className="min-w-0 flex-1">
              <Field label="Setup key (manual entry)">
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={setup.secret}
                    onFocus={(event) => event.target.select()}
                    className={`${inputCls} font-mono tracking-[0.15em]`}
                  />
                  <Button
                    variant="outline"
                    className="shrink-0"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(setup.secret);
                        toast('Setup key copied.');
                      } catch {
                        toast('Your browser blocked the clipboard.', 'error');
                      }
                    }}
                  >
                    <Copy size={15} aria-hidden />
                  </Button>
                </div>
              </Field>
              <p className="text-xs text-slate-500">
                Issuer {setup.issuer} · Account {setup.account}
              </p>

              <form onSubmit={verify} className="mt-3">
                <CodeField name="code" hint="Codes change every 30 seconds." autoFocus />
                <div className="flex gap-2">
                  <Button type="submit" disabled={busy}>
                    {busy ? 'Verifying…' : 'Verify and turn on'}
                  </Button>
                  <Button type="button" variant="outline" onClick={cancel} disabled={busy}>
                    <X size={15} aria-hidden />
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </Card>
      )}

      {codes && <Card><RecoveryCodes codes={codes} onDone={() => setCodes(null)} /></Card>}

      {enabled && !codes && (
        <>
          <Card title="Lost your recovery codes?">
            <p className="mb-3 text-sm text-slate-600">
              Issuing a new set invalidates the old ones. Your authenticator keeps working — this
              does not re-enrol anything.
            </p>
            <form onSubmit={renew} className="max-w-md">
              <Field label="Your password">
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={renewForm.password}
                  onChange={(event) => setRenewForm((f) => ({ ...f, password: event.target.value }))}
                  className={inputCls}
                />
              </Field>
              <CodeField
                label="Current code"
                name="renewCode"
                recovery
                hint="Either the 6 digits from your authenticator or one unused recovery code."
                value={renewForm.code}
                onChange={(event) => setRenewForm((f) => ({ ...f, code: event.target.value }))}
              />
              <Button type="submit" variant="outline" disabled={busy}>
                <KeyRound size={15} aria-hidden />
                {busy ? 'Working…' : 'Issue new recovery codes'}
              </Button>
            </form>
          </Card>

          <Card title="Turn two-factor off">
            <p className="mb-3 text-sm text-slate-600">
              This removes the authenticator and destroys every recovery code. If the platform
              policy requires two-factor, you will be asked to enrol again at your next sign-in.
            </p>
            <form onSubmit={disable} className="max-w-md">
              <Field label="Your password">
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={disableForm.password}
                  onChange={(event) => setDisableForm((f) => ({ ...f, password: event.target.value }))}
                  className={inputCls}
                />
              </Field>
              <CodeField
                label="Confirm with a code"
                name="disableCode"
                recovery
                hint="Your authenticator must still be working, or you need an unused recovery code."
                value={disableForm.code}
                onChange={(event) => setDisableForm((f) => ({ ...f, code: event.target.value }))}
              />
              <Button type="submit" variant="danger" disabled={busy}>
                {busy ? 'Working…' : 'Turn off two-factor'}
              </Button>
            </form>
          </Card>
        </>
      )}
    </>
  );
}
