import { NextResponse } from 'next/server';
import { authorize } from '@/lib/auth/session';

export const runtime = 'nodejs';

// The backend has no sales-staff domain: no staff records, territories, document vault or
// verification workflow. This endpoint is kept so the form fails loudly instead of half-saving.
export async function POST() {
  const a = await authorize(['merchant_admin']);
  if (a.error) return NextResponse.json({ error: a.error }, { status: a.status });

  return NextResponse.json(
    {
      error:
        'Sales staff records are not connected to the backend yet. There is no staff, territory or document API.',
    },
    { status: 501 },
  );
}
