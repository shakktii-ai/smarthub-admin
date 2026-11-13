'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button, Card, cx } from '@/components/ui';
import { num } from '@/lib/format';
import { drainNotificationQueue, getNotificationHealth } from '@/services';

// Every screen that talks about a notification service reads it from here, so
// the campaign composer and the dashboard cannot disagree about whether WhatsApp
// is actually delivering.
export const POLL_SECONDS = 20;

export const CHANNEL_LABEL = {
  sms: 'SMS',
  email: 'Email',
  whatsapp: 'WhatsApp',
  push: 'Push',
};

// The words come straight from the backend's states. None of them is a claim
// about a service the platform did not watch work: `idle` means no recent
// traffic, `unconfigured` means the credentials are missing, `disabled` means
// the stub is wired up instead of a vendor.
export const STATE_LABEL = {
  live: 'Live',
  degraded: 'Degraded',
  down: 'Down',
  idle: 'Idle',
  unconfigured: 'Not configured',
  disabled: 'Stub',
};

const DOT = {
  live: 'bg-emerald-500',
  degraded: 'bg-amber-500',
  down: 'bg-red-500',
  idle: 'bg-yellow-400',
  unconfigured: 'bg-slate-400',
  disabled: 'bg-slate-300',
};

const ago = (seconds) => {
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
  return `${Math.round(seconds / 3600)}h ago`;
};

const since = (iso) => {
  if (!iso) return null;
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  return ago(seconds);
};

export function useServiceHealth({ pollSeconds = POLL_SECONDS } = {}) {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');
  const [age, setAge] = useState(0);
  const readAt = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const data = await getNotificationHealth();
      readAt.current = Date.now();
      setAge(0);
      setHealth(data);
      setError('');
    } catch (err) {
      setError(err?.message || 'Could not read the notification service status.');
    }
  }, []);

  useEffect(() => {
    refresh();

    // Polling is new here: the rest of the panel fetches once per mount, but a
    // health strip that does not move is the static picture this replaced. It
    // goes quiet while the tab is hidden and catches up when it is shown again.
    const poll = setInterval(() => {
      if (!document.hidden) refresh();
    }, pollSeconds * 1000);
    const tick = setInterval(
      () => setAge(Math.round((Date.now() - readAt.current) / 1000)),
      1000,
    );
    const onResume = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener('visibilitychange', onResume);

    return () => {
      clearInterval(poll);
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onResume);
    };
  }, [refresh, pollSeconds]);

  return { health, error, age, refresh };
}

export const channelOf = (health, channel) =>
  health?.channels?.find((c) => c.channel === channel) || null;

const ChannelTile = ({ channel }) => {
  const state = channel.state || 'idle';
  const details = [];

  if (state === 'down' || state === 'unconfigured') {
    details.push(
      channel.holdsTraffic
        ? `${num(channel.queued)} message${channel.queued === 1 ? '' : 's'} held in the queue`
        : 'Nothing queued',
    );
  }
  if (state === 'disabled') {
    details.push('The stub logs instead of calling a vendor');
  }
  if (channel.samples > 0) {
    details.push(
      `${num(channel.successes)}/${num(channel.samples)} reached the provider in the last ${channel.windowMinutes}m`,
    );
  } else if (state === 'idle') {
    details.push(`No send in the last ${channel.windowMinutes}m`);
  }
  if (channel.lastError) {
    details.push(channel.lastError.slice(0, 90));
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
      <div className="flex items-center gap-2">
        <span
          className={cx('h-2.5 w-2.5 shrink-0 rounded-full', DOT[state] || DOT.idle)}
          aria-hidden
        />
        <p className="text-sm font-semibold text-slate-900">
          {CHANNEL_LABEL[channel.channel] || channel.channel}
        </p>
        <p className="ml-auto text-xs font-medium text-slate-600">{STATE_LABEL[state] || state}</p>
      </div>
      <p className="mt-1 truncate text-xs text-slate-500" title={details.join(' · ')}>
        {channel.provider}
        {channel.credentialsPresent || state === 'disabled' ? '' : ' — credentials missing'}
      </p>
      <ul className="mt-1 space-y-0.5">
        {details.map((line) => (
          <li key={line} className="text-xs text-slate-600">
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default function ServiceHealthStrip() {
  const { health, error, age, refresh } = useServiceHealth();
  const [drainNote, setDrainNote] = useState('');
  const [draining, setDraining] = useState(false);

  const drain = async () => {
    setDraining(true);
    setDrainNote('');
    try {
      const report = await drainNotificationQueue();
      const parts = [`${num(report.delivered)} delivered`, `${num(report.failed)} failed`];
      if (report.dropped) parts.push(`${num(report.dropped)} dropped`);
      if (report.expired) parts.push(`${num(report.expired)} expired`);
      if (report.held) {
        parts.push(
          `${num(report.held)} still held${
            report.heldChannels.length ? ` (${report.heldChannels.join(', ')})` : ''
          }`,
        );
      }
      setDrainNote(`Tried the backlog: ${parts.join(', ')}.`);
    } catch (err) {
      setDrainNote(err?.message || 'The queue could not be drained.');
    }
    setDraining(false);
    refresh();
  };

  if (!health) {
    return (
      <Card title="Notification services">
        <p className="text-sm text-slate-600" role="status">
          {error || 'Reading the provider status…'}
        </p>
      </Card>
    );
  }

  const queue = health.queue || {};
  const held = health.channels.filter((c) => c.holdsTraffic && c.queued > 0);

  return (
    <Card
      title="Notification services"
      action={
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {error ? (
              <span className="text-red-600">
                {error} Last read {ago(age)}.
              </span>
            ) : (
              `Live · read ${age}s ago, refreshes every ${POLL_SECONDS}s`
            )}
          </span>
          <Button variant="outline" onClick={refresh} className="!px-2 !py-1">
            <RefreshCw size={14} aria-hidden />
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {health.channels.map((channel) => (
          <ChannelTile key={channel.channel} channel={channel} />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
        <span>
          Overall:{' '}
          <b className={cx(held.length ? 'text-red-600' : 'text-slate-700')}>
            {STATE_LABEL[health.overall] || health.overall}
          </b>
        </span>
        <span>
          {num(queue.queued)} queued of {num(queue.maxRows)} cap · messages expire after{' '}
          {queue.ttlMinutes}m
        </span>
        {queue.oldestQueuedAt ? <span>Oldest waiting {since(queue.oldestQueuedAt)}</span> : null}
        {queue.isFull ? (
          <span className="font-semibold text-red-600">
            The queue is full: the newest messages are dropped instead of displacing older ones.
          </span>
        ) : null}
      </div>

      {held.length ? (
        <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          {held.map((c) => `${CHANNEL_LABEL[c.channel] || c.channel} (${num(c.queued)})`).join(', ')}{' '}
          are parked while the provider is unusable. The worker retries them on its own as soon as
          the channel recovers — no send is replayed twice, and nothing waits past its expiry.
        </p>
      ) : null}

      {queue.queued > 0 ? (
        <div className="mt-3 flex items-center gap-3">
          <Button variant="outline" onClick={drain} disabled={draining}>
            Drain the queue now
          </Button>
          {drainNote ? <span className="text-xs text-slate-600">{drainNote}</span> : null}
        </div>
      ) : null}
    </Card>
  );
}
