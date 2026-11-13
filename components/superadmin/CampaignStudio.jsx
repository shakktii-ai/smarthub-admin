'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, Copy, Megaphone, RefreshCw, Save, Send, Trash2 } from 'lucide-react';
import { Button, Card, ConfirmDialog, Field, cx, inputCls } from '@/components/ui';
import { DataTable, ImageField } from '@/components/ui/blocks';
import { useApp } from '@/components/ui/AppContext';
import { DEEP_LINK_OPTIONS, EXTERNAL_DEEP_LINK } from '@/lib/deepLinks';
import { num } from '@/lib/format';
import {
  CHANNEL_LABEL,
  STATE_LABEL,
  channelOf,
  useServiceHealth,
} from '@/components/superadmin/ServiceHealth';
import {
  audienceOptions,
  cancelCampaign,
  channelOptions,
  deleteCampaign,
  listDeliveries,
  previewAudience,
  saveCampaign,
  sendBatch,
} from '@/app/super-admin/campaigns/actions';

const KINDS = [
  ['festival', 'Festival greeting'],
  ['offer', 'Offer or promotion'],
  ['feature', 'New feature'],
  ['release', 'New app version'],
  ['general', 'General announcement'],
];

// Mirrors CampaignAudience in the backend. Who is actually in "every merchant"
// depends on the medium: on push it is every device registered by a signed-in
// app, on SMS and WhatsApp every account with a phone number and marketing
// consent, on email every account with an address and the same consent.
const AUDIENCES = [
  ['all_merchants', 'Every merchant'],
  ['branch', 'One branch'],
  ['group', 'One merchant group'],
  ['category', 'One merchant category'],
  ['merchant', 'One merchant'],
];

const CODE_LABEL = {
  branch: 'Branch',
  group: 'Merchant group',
  category: 'Merchant category',
  merchant: 'Merchant code',
};

const STATUS_TONE = {
  draft: 'bg-slate-100 text-slate-700',
  sending: 'bg-blue-50 text-blue-700',
  sent: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-red-50 text-red-700',
  canceled: 'bg-amber-50 text-amber-800',
};

const BATCH = 200;

const blank = {
  name: '',
  kind: 'festival',
  title: '',
  body: '',
  imageUrl: '',
  deepLink: '',
  deepLinkUrl: '',
  audience: 'all_merchants',
  audienceCode: '',
  channel: 'push',
};

// Every sentence here is conditioned on a flag the backend sent, so the
// composer can never assure an operator about a rule it does not enforce. The
// definition of a recipient is the Field hint; these are the consequences.
const channelNotes = (spec) => {
  if (!spec) return [];
  const notes = [];
  if (spec.billed) {
    notes.push('the vendor bills per message, so a wide audience costs real money');
  }
  if (spec.needs_marketing_consent) {
    notes.push('only accounts with standing marketing consent are reachable');
  }
  notes.push(
    spec.writes_inbox
      ? 'the same copy is also written into the merchant inbox'
      : 'nothing is written to the inbox — the message travels only on this medium',
  );
  return notes;
};

// The medium's name is the backend's when the list could be read, and the
// panel's shared vocabulary when it could not.
const channelName = (channel, spec) =>
  spec?.label || CHANNEL_LABEL[channel] || channel || '';

const label = (list, value) => list.find(([v]) => v === value)?.[1] || value || '';

// The panel only ever sends the app's own screen paths or an explicit URL, which
// is what makes a stored deep_link something the merchant app can act on.
const deepLinkValue = (form) =>
  form.deepLink === EXTERNAL_DEEP_LINK
    ? form.deepLinkUrl.trim()
    : form.deepLink || null;

const splitDeepLink = (value) => {
  if (!value) return { deepLink: '', deepLinkUrl: '' };
  const onList = DEEP_LINK_OPTIONS.some(([, path]) => path === value);
  return onList
    ? { deepLink: value, deepLinkUrl: '' }
    : { deepLink: EXTERNAL_DEEP_LINK, deepLinkUrl: value };
};

const Pill = ({ value }) => (
  <span
    className={cx(
      'inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium capitalize',
      STATUS_TONE[value] || 'bg-slate-100 text-slate-600',
    )}
  >
    {value}
  </span>
);

// Whether this medium can reach anyone at all is not something the composer
// should answer from memory. The same live health read the dashboard strip uses
// decides whether "sent" means "delivered"; this falls back to what the batch
// itself reported only when that read has not landed.
const ChannelNotice = ({ channel, spec, live, state }) => {
  const box = 'rounded-lg p-3 text-sm';
  const name = channelName(channel, spec);
  const env = `NOTIFICATION_PROVIDER_${String(channel).toUpperCase()}`;
  const afterword = spec?.writes_inbox
    ? 'The inbox entries are written, and merchants will see the message there, but no phone buzzed.'
    : 'Nothing was written to the merchant inbox, so on this medium nobody received anything.';

  if (!live) {
    if (!state || state.delivers_real_message) return null;
    return (
      <p className={cx(box, 'bg-amber-50 text-amber-900')}>
        The {name} provider on this server is <b>{state.provider}</b>, so nothing left the building.{' '}
        {afterword} Set <code>{env}</code> to a configured vendor to send for real.
      </p>
    );
  }

  if (live.isStub) {
    return (
      <p className={cx(box, 'bg-amber-50 text-amber-900')}>
        The {name} provider on this server is <b>{live.provider}</b>, so nothing left the building.{' '}
        {afterword} Set <code>{env}</code> to a configured vendor to send for real.
      </p>
    );
  }

  if (live.state === 'down' || live.state === 'unconfigured') {
    return (
      <p className={cx(box, 'bg-red-50 text-red-800')} role="alert">
        {name} is <b>{STATE_LABEL[live.state] || live.state}</b> ({live.provider}
        {live.lastError ? `: ${live.lastError.slice(0, 120)}` : ''}). Everything still queued is held
        until it recovers and is then delivered by the notification worker — the audience list is not
        lost, and no address is sent to twice.
      </p>
    );
  }

  if (live.state === 'degraded') {
    return (
      <p className={cx(box, 'bg-amber-50 text-amber-900')}>
        {name} is <b>{STATE_LABEL[live.state]}</b>: {num(live.failures)} of {num(live.samples)}{' '}
        attempts in the last {live.windowMinutes} minutes did not reach the provider. Failed sends are
        retried on the queue schedule, not discarded.
      </p>
    );
  }

  return null;
};

const Progress = ({ state, spec, live }) => {
  if (!state) return null;

  const done = state.sent + state.failed;
  const share = state.recipients ? Math.round((done / state.recipients) * 100) : 0;

  return (
    <Card title={`Sending ${state.ref} over ${channelName(state.channel, spec)}`}>
      <div className="space-y-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={cx('h-2 rounded-full', state.error ? 'bg-red-500' : 'bg-brand')}
            style={{ width: `${Math.max(share, state.running ? 4 : 0)}%` }}
            aria-hidden
          />
        </div>
        <p className="text-sm text-slate-700" role="status">
          {num(done)} of {num(state.recipients)} recipients reached · {num(state.sent)} delivered,{' '}
          {num(state.failed)} failed
          {state.remaining > 0 ? ` · ${num(state.remaining)} still in the queue` : ''}
          {state.running ? ' — working through the queue…' : ''}
        </p>
        <ChannelNotice channel={state.channel} spec={spec} live={live} state={state} />
        {state.error ? (
          <p className="text-sm text-red-600" role="alert">
            {state.error}
          </p>
        ) : null}
      </div>
    </Card>
  );
};

const DeliveryLog = ({ log, spec, onClose }) => {
  if (!log) return null;

  const name = channelName(log.channel, spec);

  return (
    <Card
      title={`Deliveries ${log.ref} over ${name}`}
      action={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      {log.error ? (
        <p className="text-sm text-red-600" role="alert">
          {log.error}
        </p>
      ) : log.rows.length === 0 ? (
        <p className="text-sm text-slate-600">
          Nothing has been reached yet - the queue is written on the first send.
        </p>
      ) : (
        <>
          <p className="mb-2 text-xs text-slate-500">
            Showing {num(log.rows.length)} of {num(log.total)} attempts over {name}. Each row carries
            one recipient address, and that address is a credential or personal data, so only as much
            of it as identifies the account is ever shown. The platform column is filled by push
            only, since a phone number or an email address belongs to no device.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs text-slate-600">
                  <th className="px-3 py-2 font-semibold">Merchant</th>
                  <th className="px-3 py-2 font-semibold">Platform</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                  <th className="px-3 py-2 font-semibold">Attempts</th>
                  <th className="px-3 py-2 font-semibold">Address</th>
                  <th className="px-3 py-2 font-semibold">Message id</th>
                  <th className="px-3 py-2 font-semibold">Error</th>
                </tr>
              </thead>
              <tbody>
                {log.rows.map((d, i) => (
                  <tr key={`${d.address}-${i}`} className="border-t border-slate-100">
                    <td className="whitespace-nowrap px-3 py-2">{d.merchant_code || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2 capitalize">{d.platform || '—'}</td>
                    <td className="px-3 py-2">
                      <Pill value={d.status} />
                    </td>
                    <td className="px-3 py-2">{num(d.attempts)}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{d.address || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                      {d.provider_message_id || '—'}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">{d.error || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
};

export default function CampaignStudio({ data }) {
  const router = useRouter();
  const { toast } = useApp();
  const campaigns = data?.campaigns || [];

  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [codes, setCodes] = useState([]);
  const [codesFailed, setCodesFailed] = useState(false);
  const [channels, setChannels] = useState([]);
  const [channelsFailed, setChannelsFailed] = useState(false);
  const [count, setCount] = useState(null);
  const [countNote, setCountNote] = useState('');
  const [progress, setProgress] = useState(null);
  const [log, setLog] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const timer = useRef(null);
  // Whether a medium can reach anyone at all is not something the composer
  // should answer from memory, so the live health of the chosen one is read the
  // same way the dashboard strip reads it.
  const { health } = useServiceHealth();
  const live = channelOf(health, form.channel);
  // A broadcast already running keeps the medium it was claimed with, so the
  // spec is looked up from that report rather than from whatever the dropdown
  // happens to show now.
  const specOf = (channel) => channels.find((c) => c.channel === channel) || null;
  const spec = specOf(form.channel);
  // Only push has payload slots for the artwork and the tap target, and that is
  // the backend's flag rather than this file's opinion of what a channel is.
  const sendsArtwork = spec ? spec.sends_image_and_deep_link : true;
  // When the media list could not be read, the dropdown keeps the one name the
  // panel already knows instead of offering media the server may refuse.
  const mediumOptions = channels.length
    ? channels.map((c) => ({ value: c.channel, text: c.label }))
    : [{ value: form.channel, text: channelName(form.channel, null) }];

  const set = (patch) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };

  // The Medium dropdown and everything the composer says about a medium comes
  // from the backend, so a rule can be renamed or re-priced without a release.
  useEffect(() => {
    let alive = true;

    channelOptions().then((res) => {
      if (!alive) return;
      setChannels(res.channels || []);
      setChannelsFailed(Boolean(res.error));
      // The starting medium is the backend's default, not a word written here:
      // a fresh draft adopts it as soon as the list lands, unless the operator
      // has already chosen one.
      if (res.default) {
        setForm((f) => (f.channel === blank.channel ? { ...f, channel: res.default } : f));
      }
    });

    return () => {
      alive = false;
    };
  }, []);

  // A narrowed audience is only meaningful with a code that exists, so the
  // picker is filled from the same endpoints the rest of the panel edits.
  useEffect(() => {
    let alive = true;
    setCodes([]);
    setCodesFailed(false);

    if (form.audience === 'all_merchants' || form.audience === 'merchant') {
      return undefined;
    }

    audienceOptions(form.audience).then((res) => {
      if (!alive) return;
      setCodes(res.options || []);
      setCodesFailed(Boolean(res.error));
    });

    return () => {
      alive = false;
    };
  }, [form.audience]);

  // Live reach, recounted when the audience or the medium changes.
  // The medium is in the dependency list on purpose: switching a broadcast from
  // push to SMS changes who is in it, and a count that did not move would be
  // selling the operator a number that describes a different send.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);

    if (form.audience !== 'all_merchants' && !form.audienceCode.trim()) {
      setCount(null);
      setCountNote(`${CODE_LABEL[form.audience]} not chosen yet.`);
      return undefined;
    }

    // Cleared before the recount, so the number on screen is never one that
    // was counted for a different audience or a different medium.
    setCount(null);
    setCountNote('Counting who this reaches…');
    timer.current = setTimeout(async () => {
      const res = await previewAudience(form.audience, form.audienceCode, form.channel);
      if (res.error) {
        setCount(null);
        setCountNote(res.error);
        return;
      }
      setCount(res.preview);
      setCountNote('');
    }, 350);

    return () => clearTimeout(timer.current);
  }, [form.audience, form.audienceCode, form.channel]);

  const reset = () => {
    setForm(blank);
    setEditing(null);
    setDirty(false);
    setCount(null);
    setCountNote('');
  };

  const load = (c) => {
    setEditing(c.campaign_ref);
    setDirty(false);
    setForm({
      ...blank,
      name: c.name || '',
      kind: c.kind || 'general',
      title: c.title || '',
      body: c.body || '',
      imageUrl: c.image_url || '',
      audience: c.audience || 'all_merchants',
      audienceCode: c.audience_code || '',
      channel: c.channel || 'push',
      ...splitDeepLink(c.deep_link),
    });
    setCount(null);
    setCountNote('');
  };

  // A campaign past draft is a fixed record the backend refuses to edit, so the
  // way to change one is to carry its copy into a new draft and send that. This
  // fills the composer but leaves editing null, so Save creates a new campaign.
  const duplicate = (c) => {
    load(c);
    setEditing(null);
    setDirty(true);
    setForm((f) => ({ ...f, name: `${c.name || 'Campaign'} (copy)` }));
    toast('Opened as a new draft. Edit it, then Save as draft — the original is unchanged.');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const save = async () => {
    setBusy(true);
    const res = await saveCampaign(editing, {
      ...form,
      deepLink: deepLinkValue(form),
    });
    setBusy(false);

    if (res.error) {
      toast(res.error, 'error');
      return;
    }

    toast(editing ? 'Draft updated.' : 'Draft saved.');
    setEditing(res.campaign?.campaign_ref || editing);
    setDirty(false);
    router.refresh();
  };

  // Fan-out is a loop of short calls, not one long request: a vendor accepts one
  // address at a time and a few thousand would outlast any HTTP timeout.
  // Each call drains up to BATCH pending rows and reports what is left.
  const deliver = async (campaign) => {
    setBusy(true);
    let prevDone = -1;

    for (let attempt = 0; attempt < 500; attempt += 1) {
      const res = await sendBatch(campaign.campaign_ref, BATCH);

      if (res.error) {
        toast(res.error, 'error');
        setProgress((p) => (p ? { ...p, running: false, error: res.error } : p));
        break;
      }

      const r = res.report;
      const done = r.sent + r.failed;
      setProgress({
        ref: r.campaign_ref,
        channel: r.channel,
        recipients: r.recipients,
        sent: r.sent,
        failed: r.failed,
        remaining: r.remaining,
        provider: r.provider,
        delivers_real_message: r.delivers_real_message,
        error: r.error,
        running: r.remaining > 0 && r.status === 'sending',
      });

      if (!r.remaining || r.status !== 'sending') {
        if (r.error) toast(r.error, 'error');
        else if (!r.delivers_real_message) {
          toast(`Nothing left the server: the ${r.channel} provider is the stub.`, 'error');
        } else {
          const medium = channelName(r.channel, specOf(r.channel));
          toast(`Reached ${num(r.sent)} of ${num(r.recipients)} recipients on ${medium}.`);
        }
        break;
      }

      // A queue that reports the same numbers twice is not moving, so stop
      // hammering the batch the backend cannot drain.
      if (done === prevDone) {
        toast(
          `${num(r.remaining)} are still queued but nothing more was delivered. Open the delivery log.`,
          'error',
        );
        break;
      }
      prevDone = done;
    }

    setBusy(false);
    router.refresh();
  };

  const run = async (action, done) => {
    setBusy(true);
    const res = await action();
    setBusy(false);

    if (res.error) {
      toast(res.error, 'error');
      return;
    }

    setConfirm(null);
    done?.(res);
    router.refresh();
  };

  const openLog = async (campaign) => {
    const res = await listDeliveries(campaign.campaign_ref);
    setLog({
      ref: campaign.campaign_ref,
      rows: res.deliveries || [],
      total: res.total || 0,
      // The log names the medium the backend delivered on, which is the
      // campaign's own column and not whatever the composer is showing.
      channel: res.channel || campaign.channel,
      error: res.error,
    });
  };

  // The warning shown before a broadcast leaves must be the warning for the
  // medium it will travel on - whether there is an inbox copy, whether the
  // vendor bills, and what cannot be taken back.
  const sendWarning = (campaign) => {
    const chosen = specOf(campaign.channel);
    const medium = channelName(campaign.channel, chosen);

    if (!chosen) {
      return `${medium}: the API could not describe this medium, so check what it reaches before sending. Once a message has left it cannot be recalled - only the queue still waiting can be refused.`;
    }

    const reach = chosen.writes_inbox
      ? `This writes an inbox entry for the audience and pushes it to ${chosen.addresses} in it.`
      : `This sends the message itself to ${chosen.addresses} in its audience; nothing is written to the merchant inbox.`;
    const cost = chosen.billed
      ? ' The vendor bills per message, so a wide audience costs real money. '
      : ' ';

    return `${medium} · ${reach}${cost}Once a message has left it cannot be recalled - only the recipients still waiting in the queue can be refused.`;
  };

  const confirmMedium = confirm
    ? channelName(confirm.campaign.channel, specOf(confirm.campaign.channel))
    : '';

  const columns = [
    { key: 'name', label: 'Campaign' },
    { key: 'kind', label: 'Kind' },
    { key: 'channel', label: 'Medium' },
    { key: 'audience', label: 'Audience' },
    { key: 'status', label: 'Status' },
    { key: 'counts', label: 'Reached' },
    { key: 'provider', label: 'Provider' },
    { key: 'updated', label: 'Updated' },
  ];

  const cell = (c, r) => {
    if (c.key === 'name') {
      return (
        <div className="min-w-40">
          <p className="font-medium text-slate-900">{r.name}</p>
          <p className="truncate text-xs text-slate-500" title={r.title}>
            {r.title}
          </p>
        </div>
      );
    }
    if (c.key === 'kind') {
      return label(KINDS, r.kind);
    }
    if (c.key === 'channel') {
      return channelName(r.channel, specOf(r.channel));
    }
    if (c.key === 'audience') {
      return (
        <span>
          {label(AUDIENCES, r.audience)}
          {r.audience_code ? ` · ${r.audience_code}` : ''}
        </span>
      );
    }
    if (c.key === 'status') {
      return <Pill value={r.status} />;
    }
    if (c.key === 'counts') {
      return (
        <span>
          {num(r.sent_count)} sent · {num(r.failed_count)} failed of{' '}
          {num(r.recipient_count)}
        </span>
      );
    }
    if (c.key === 'provider') {
      return r.provider || '—';
    }
    return (
      <span className="text-xs text-slate-500">
        {r.updated_at ? new Date(r.updated_at).toLocaleString('en-IN') : '—'}
      </span>
    );
  };

  const actions = (r) => (
    <div className="flex flex-wrap gap-1">
      {r.status === 'draft' ? (
        <>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setConfirm({ kind: 'send', campaign: r })}
          >
            <Send size={15} aria-hidden />
            Send
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => load(r)}>
            <Save size={15} aria-hidden />
            Edit
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              setConfirm({
                kind: 'delete',
                campaign: r,
                run: () => deleteCampaign(r.campaign_ref),
                done: () => toast('Draft deleted.'),
              })
            }
          >
            <Trash2 size={15} aria-hidden />
            Delete
          </Button>
        </>
      ) : null}
      {r.status === 'sending' ? (
        <>
          {/* Resuming is the same call: the queue is resumable by design, so a
              closed tab or a dropped request does not lose the broadcast. */}
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setConfirm({ kind: 'resume', campaign: r })}
          >
            <RefreshCw size={15} aria-hidden />
            Resume
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              setConfirm({
                kind: 'cancel',
                campaign: r,
                run: () => cancelCampaign(r.campaign_ref),
                done: () => toast('Broadcast called off; the queue was refused.'),
              })
            }
          >
            <Ban size={15} aria-hidden />
            Cancel
          </Button>
        </>
      ) : null}
      {r.status !== 'draft' ? (
        <Button variant="outline" disabled={busy} onClick={() => duplicate(r)}>
          <Copy size={15} aria-hidden />
          Duplicate
        </Button>
      ) : null}
      <Button variant="outline" onClick={() => openLog(r)}>
        Deliveries
      </Button>
    </div>
  );

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-sm text-slate-600">
            One message, written here, then sent on the medium you choose: push goes to every
            registered device and lands in the merchant inbox, while SMS, WhatsApp and email carry
            the copy itself to the address on each account. Diwali wishes, offers, new features, new
            versions.
          </p>
        </div>
        {data?.error ? (
          <p className="text-sm text-red-600" role="alert">
            {data.error}
          </p>
        ) : null}
      </div>

      {data?.error && campaigns.length === 0 ? (
        <Card>
          <p className="p-2 text-sm text-slate-600">
            The campaigns routes did not answer. That usually means the deployed API is behind this
            panel - the feature exists in the backend but has not been released yet.
          </p>
        </Card>
      ) : null}

      <Card
        title={
          <span className="flex items-center gap-2">
            <Megaphone size={16} aria-hidden />
            {editing ? `Editing ${editing}` : 'New campaign'}
          </span>
        }
        action={
          editing ? (
            <Button variant="outline" onClick={reset}>
              Start a new one
            </Button>
          ) : null
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Internal name" hint="Only you see this. It is how you find the campaign again.">
            <input
              className={inputCls}
              value={form.name}
              maxLength={120}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="Diwali greetings 2026"
            />
          </Field>
          <Field label="What is this about?">
            <select
              className={inputCls}
              value={form.kind}
              onChange={(e) => set({ kind: e.target.value })}
            >
              {KINDS.map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Title" hint="The first line of the notification, in the inbox and on the phone.">
            <input
              className={inputCls}
              value={form.title}
              maxLength={255}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="Happy Diwali from SmartHub Pay"
            />
          </Field>
          <Field
            label="Opens on tap"
            hint={
              sendsArtwork
                ? 'Every choice is a real screen in the merchant app.'
                : `Push only. On ${channelName(form.channel, spec)} the message itself is what arrives, so a tap opens nothing.`
            }
          >
            <select
              className={inputCls}
              value={form.deepLink}
              onChange={(e) => set({ deepLink: e.target.value })}
            >
              <option value="">Notification only — nothing opens</option>
              {DEEP_LINK_OPTIONS.map(([text, value]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </Field>
          {form.deepLink === EXTERNAL_DEEP_LINK ? (
            <Field label="Web address" hint="Opened in the phone's browser.">
              <input
                className={inputCls}
                value={form.deepLinkUrl}
                onChange={(e) => set({ deepLinkUrl: e.target.value })}
                placeholder="https://smarthubpay.com/diwali"
              />
            </Field>
          ) : null}
          <Field
            label="Message"
            hint={
              spec?.writes_inbox
                ? 'Kept short on purpose: a phone shows about the first line, and the full text lives in the inbox.'
                : `The whole of it: on ${channelName(form.channel, spec)} there is no inbox copy holding the rest, so anything a merchant needs has to be in this text.`
            }
          >
            <textarea
              className={cx(inputCls, 'min-h-28')}
              rows={5}
              value={form.body}
              maxLength={2000}
              onChange={(e) => set({ body: e.target.value })}
              placeholder="May this festival of lights bring brightness to your business and prosperity to your home."
            />
          </Field>
          <Field
            label="Greeting image"
            hint={
              sendsArtwork
                ? 'Shown above the message in the inbox and sent with the push. Upload stores it in the private bucket; the app gets a loadable link.'
                : 'Push only. This draft has no room for an image on its medium, so the file stays with the draft and is never sent.'
            }
          >
            <ImageField
              field={{ name: 'imageUrl', label: 'Greeting image', folder: 'notifications', maxMb: 5 }}
              value={form.imageUrl}
              onValue={(imageUrl) => set({ imageUrl })}
            />
          </Field>
          <Field label="Audience">
            <select
              className={inputCls}
              value={form.audience}
              onChange={(e) => set({ audience: e.target.value, audienceCode: '' })}
            >
              {AUDIENCES.map(([value, text]) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </Field>
          {form.audience !== 'all_merchants' ? (
            codes.length > 0 ? (
              <Field
                label={CODE_LABEL[form.audience]}
                hint="Read from the live list, so a code that no longer exists cannot be chosen."
              >
                <select
                  className={inputCls}
                  value={form.audienceCode}
                  onChange={(e) => set({ audienceCode: e.target.value })}
                >
                  <option value="">Choose one…</option>
                  {codes.map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.name ? `${o.name} (${o.code})` : o.code}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field
                label={CODE_LABEL[form.audience]}
                hint={
                  codesFailed
                    ? 'The list of these could not be loaded, so type the code exactly as it appears in its own screen.'
                    : 'Type the code exactly as it appears in its own screen.'
                }
              >
                <input
                  className={inputCls}
                  value={form.audienceCode}
                  maxLength={40}
                  onChange={(e) => set({ audienceCode: e.target.value })}
                  placeholder={form.audience === 'merchant' ? 'MRC000001' : 'BR0001'}
                />
              </Field>
            )
          ) : null}
          <Field
            label="Medium"
            hint={
              spec
                ? `A recipient is ${spec.addresses}.`
                : channelsFailed
                  ? 'The API could not say which media this server sends campaigns on, so only the one this panel already knows is offered. Saving a different choice may be refused.'
                  : 'Reading which media this server can send on…'
            }
          >
            <select
              className={inputCls}
              value={form.channel}
              onChange={(e) => set({ channel: e.target.value })}
            >
              {mediumOptions.map(({ value, text }) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </Field>
          {spec ? (
            <ul className="-mt-2 space-y-0.5 text-xs text-slate-500 md:col-span-2">
              {channelNotes(spec).map((note) => (
                <li key={note}>· {note}</li>
              ))}
            </ul>
          ) : null}
          <div className="md:col-span-2">
            <p className="text-sm text-slate-700" role="status">
              {count ? (
                <>
                  On <b>{channelName(count.channel, specOf(count.channel))}</b> this reaches{' '}
                  <b>{num(count.recipients)}</b> recipients across{' '}
                  <b>{num(count.merchants)}</b> merchants
                  {count.sample?.length ? `, e.g. ${count.sample.join(', ')}` : ''}.
                </>
              ) : (
                countNote || 'Choose an audience and a medium to see what it reaches.'
              )}
            </p>
            {count ? (
              <p className="mt-1 text-xs text-slate-500">
                A recipient is{' '}
                {specOf(count.channel)?.addresses || 'an address the medium can use'}.{' '}
                {num(count.accounts)} active accounts are in this audience
                {count.missing_address
                  ? `, of which ${num(count.missing_address)} have no address this medium can use`
                  : ''}
                {count.unconsented
                  ? `, and ${num(count.unconsented)} have no standing marketing consent`
                  : ''}
                . Sending greets the recipients above and nobody else.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 md:col-span-2">
            <Button disabled={busy} onClick={save}>
              <Save size={16} aria-hidden />
              {editing ? 'Save draft' : 'Save as draft'}
            </Button>
            <Button
              disabled={busy || !editing}
              onClick={() =>
                setConfirm({
                  kind: 'send',
                  campaign: { campaign_ref: editing, name: form.name, channel: form.channel },
                })
              }
            >
              <Send size={16} aria-hidden />
              Send saved draft
            </Button>
          </div>
          <p className="text-xs text-slate-500 md:col-span-2">
            Saving never sends. A draft is editable until the first batch runs; after that it is a
            record of what merchants were told.
            {editing && dirty ? (
              <span className="text-amber-700">
                {' '}
                This form has unsaved edits — sending delivers what was last saved, not what is on
                screen.
              </span>
            ) : null}
          </p>
        </div>
      </Card>

      <Progress
        state={progress}
        spec={specOf(progress?.channel)}
        live={channelOf(health, progress?.channel || form.channel)}
      />
      <DeliveryLog
        log={log}
        spec={specOf(log?.channel)}
        onClose={() => setLog(null)}
      />

      <Card title="All campaigns">
        {campaigns.length === 0 ? (
          <p className="p-2 text-sm text-slate-600">
            Nothing authored yet. Write the first one above - it stays a draft until you send it.
          </p>
        ) : (
          <DataTable columns={columns} rows={campaigns} renderCell={cell} renderActions={actions} onRowClick={(r) => load(r)} rowClassName="cursor-pointer" />
        )}
      </Card>

      {confirm ? (
        <ConfirmDialog
          title={
            confirm.kind === 'cancel'
              ? `Call off “${confirm.campaign.name}”`
              : confirm.kind === 'delete'
                ? `Delete “${confirm.campaign.name}”`
                : `Send “${confirm.campaign.name}” over ${confirmMedium}`
          }
          message={
            confirm.kind === 'cancel'
              ? `What ${confirmMedium} already delivered cannot be taken back. Every recipient still waiting in the queue is refused, so a later batch cannot greet someone you have already called off.`
              : confirm.kind === 'delete'
                ? 'The draft and its copy are removed. Nothing has been sent yet, so no merchant sees anything.'
                : confirm.kind === 'resume'
                  ? 'The remaining queue is delivered. Recipients already greeted are not greeted again.'
                  : sendWarning(confirm.campaign)
          }
          danger={confirm.kind === 'cancel' || confirm.kind === 'delete'}
          busy={busy}
          onConfirm={() =>
            confirm.run
              ? run(confirm.run, confirm.done)
              : deliver(confirm.campaign).then(() => setConfirm(null))
          }
          onCancel={() => setConfirm(null)}
        />
      ) : null}
    </>
  );
}
