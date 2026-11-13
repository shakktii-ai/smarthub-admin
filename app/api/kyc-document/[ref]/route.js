import { NextResponse } from 'next/server';
import { authorize } from '@/lib/auth/session';

export const runtime = 'nodejs';

const DOCUMENTS_PATH = '/api/merchant-admin/v1/onboarding/documents';
const REF = /^[A-Za-z0-9._-]{1,40}$/;

// The applicant's PAN card and bank proof are only ever shown to whoever is deciding on them.
// The backend serves the bytes to an admin credential, and an <img> tag cannot carry one, so
// this relays the response over the panel's own session. It is deliberately not cached and
// deliberately not a redirect to object storage: a public or CDN URL for these keys would make
// an identity document readable by anyone who found the link.
export async function GET(_request, { params }) {
  const a = await authorize(['super_admin', 'merchant_admin']);
  if (a.error) return NextResponse.json({ error: a.error }, { status: a.status });

  const ref = String(params?.ref || '');
  if (!REF.test(ref)) {
    return NextResponse.json({ error: 'unknown_document' }, { status: 404 });
  }

  try {
    const file = await a.api.getBlob(`${DOCUMENTS_PATH}/${encodeURIComponent(ref)}/content`);
    return new Response(file.bytes, {
      headers: {
        'Content-Type': file.contentType,
        'Content-Disposition': file.disposition || 'attachment',
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    const status = error?.status === 403 ? 403 : error?.status || 502;
    return NextResponse.json({ error: error?.message || 'Could not open the document.' }, { status });
  }
}
