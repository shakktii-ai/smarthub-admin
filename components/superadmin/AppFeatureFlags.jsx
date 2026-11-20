'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button, Card, ConfirmDialog, cx } from '@/components/ui';
import { useApp } from '@/components/ui/AppContext';
import { setAppFlag } from '@/app/super-admin/app-flags/actions';

const fmt = (d) => {
  const moment = d ? new Date(d) : null;
  return moment && !Number.isNaN(moment.valueOf())
    ? moment.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
    : null;
};

// The backend row is the truth on every render; a write re-reads it through
// refresh() rather than guessing what the switch now says.
const source = (flag) => {
  if (!flag.stored) {
    return `Never written here, so every app runs the default it shipped with (${flag.default ? 'on' : 'off'}).`;
  }
  const written = fmt(flag.updated_at);
  const by = [flag.updated_by && `by ${flag.updated_by}`, written && `on ${written}`]
    .filter(Boolean)
    .join(' ');
  return `Set to ${flag.value}${by ? ` ${by}` : ''}.`;
};

const Pill = ({ on }) => (
  <span
    className={cx(
      'rounded-md px-2 py-0.5 text-xs font-medium',
      on ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600',
    )}
  >
    {on ? 'On' : 'Off'}
  </span>
);

export default function AppFeatureFlags({ data }) {
  const router = useRouter();
  const { toast } = useApp();
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const apply = async () => {
    setBusy(true);
    const res = await setAppFlag(target.key, target.enabled);
    setBusy(false);
    if (res.error) {
      toast(res.error, 'error');
      return;
    }
    setTarget(null);
    toast(`“${target.label}” ${target.enabled ? 'turned on' : 'turned off'}`);
    router.refresh();
  };

  if (data?.error) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-3 p-8 text-center text-red-600">
          <AlertTriangle size={26} aria-hidden />
          <p>Could not load the app switches.</p>
          <p className="text-sm text-slate-600">{data.error}</p>
          <Button variant="outline" onClick={() => router.refresh()}>
            <RotateCcw size={16} aria-hidden />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  const flags = data?.flags || [];

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">Merchant App Switches</h1>
        <p className="text-sm text-slate-600">
          Feature flags the SmartHubPay merchant app reads from
          A signed-in merchant picks a
          change up on their next sign-in or cold start; no store release is
          needed. Where a build refuses to honour a switch, that flag says so
          below.
        </p>
      </div>

      {flags.length === 0 ? (
        <Card>
          <p className="p-6 text-sm text-slate-600">
            The catalogue came back empty, which means the deployed API does not
            have the feature-flag routes yet.
          </p>
        </Card>
      ) : (
        flags.map((flag) => (
          <Card key={flag.key}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-slate-900">
                    {flag.label}
                  </h2>
                  <Pill on={flag.enabled} />
                </div>
                <p className="mt-1 font-mono text-xs text-slate-500">
                  {flag.key}
                </p>
                <p className="mt-2 text-sm text-slate-600">{flag.description}</p>
                <p className="mt-2 text-xs text-slate-500">{source(flag)}</p>
              </div>
              <Button
                variant={flag.enabled ? 'outline' : 'primary'}
                onClick={() =>
                  setTarget({
                    key: flag.key,
                    label: flag.label,
                    enabled: !flag.enabled,
                  })
                }
              >
                {flag.enabled ? 'Turn off' : 'Turn on'}
              </Button>
            </div>
          </Card>
        ))
      )}

      {target && (
        <ConfirmDialog
          title={`${target.enabled ? 'Turn on' : 'Turn off'} “${target.label}”`}
          message={
            target.enabled
              ? 'Every merchant app that signs in from now runs with this switch on. An app that cannot honour it in a release build keeps its current behaviour.'
              : 'Every merchant app that signs in from now runs without this feature. Merchants already inside the screen stay where they are until they navigate again.'
          }
          danger={target.enabled ? false : true}
          busy={busy}
          onConfirm={apply}
          onCancel={() => setTarget(null)}
        />
      )}
    </>
  );
}
