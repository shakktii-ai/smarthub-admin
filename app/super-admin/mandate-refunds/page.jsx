import MandateRefunds from '@/components/superadmin/MandateRefunds';
import { listMandateDebits, listRefunds } from './actions';

const PAGE_SIZE = 20;

export default async function MandateRefundsPage({ searchParams }) {
  const raw = Array.isArray(searchParams) ? searchParams[0] : searchParams;
  const tab = raw?.tab === 'refunds' ? 'refunds' : 'debits';
  const q = String(raw?.q || '').trim();
  const rawStatus = String(raw?.status || '').trim().toLowerCase();
  const DEBIT_STATUSES = ['success', 'pending', 'failed', 'created', 'notified'];
  const REFUND_STATUSES = ['pending', 'success', 'failed'];
  const allowed = tab === 'refunds' ? REFUND_STATUSES : DEBIT_STATUSES;
  const status = allowed.includes(rawStatus) ? rawStatus : '';
  const page = Math.max(1, Number(raw?.page) || 1);

  const debitsRes = await listMandateDebits({ q, status: tab === 'debits' ? status : '', page, pageSize: PAGE_SIZE });
  const refundsRes = await listRefunds({ q, status: tab === 'refunds' ? status : '', page, pageSize: PAGE_SIZE });

  if (debitsRes.error && tab === 'debits') {
    return <p className="p-6 text-sm text-red-600">{debitsRes.error}</p>;
  }
  if (refundsRes.error && tab === 'refunds') {
    return <p className="p-6 text-sm text-red-600">{refundsRes.error}</p>;
  }

  return (
    <div className="p-6">
      <MandateRefunds
        debits={debitsRes.data}
        refunds={refundsRes.data}
        tab={tab}
        q={q}
        status={status}
        page={page}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
