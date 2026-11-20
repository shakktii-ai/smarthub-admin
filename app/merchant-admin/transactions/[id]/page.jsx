'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/browser';
import { inr } from '@/lib/format';
import { dateParts } from '@/lib/api/labels';
import { Badge, Card, ErrorState, Spinner } from '@/components/ui';

export default function TransactionDetailPage({ params }) {
  const id = decodeURIComponent(params.id);
  const [d, setD] = useState(null);
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(false);
    api.get(`/api/payments/v1/payments/${encodeURIComponent(id)}`)
      .then((r) => { if (alive) setD(r); })
      .catch(() => { if (alive) setErr(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  if (loading) return <Spinner />;
  if (err || !d) return <ErrorState onRetry={() => { setErr(false); setLoading(true); }} />;
  const fields = [
    ['Order ID', d.order_id],
    ['Merchant', d.merchant_code],
    ['Amount', inr(d.amount_paise)],
    ['Currency', d.currency],
    ['Provider', d.provider],
    ['Channel', d.checkout_method],
    ['Status', d.status],
    ['Response code', d.response_code],
    ['Response', d.response_description],
    ['Created', dateParts(d.created_at).dateTime],
  ];
  return (
    <div className="space-y-4">
      <Link href="/merchant-admin/transactions" className="text-sm text-brand hover:underline">← Back to transactions</Link>
      <Card title={`Transaction ${id}`}>
        <dl className="divide-y divide-slate-100 text-sm">
          {fields.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2">
              <dt className="text-slate-500">{k}</dt>
              <dd className="text-right font-medium">{k === 'Status' ? <Badge value={v} /> : (v ?? '-')}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}