'use server';

import { revalidatePath } from 'next/cache';
import { authorize } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rateLimit';
import { toWire } from '@/config/legalDocuments';

const LEGAL = '/api/legal/v1';

const CODE = (value) => {
  const code = String(value || '').trim();
  return code && code.length <= 40 ? code : null;
};

const text = (value) => String(value ?? '').trim();

// The three boxes above the document body. `summary` and `effective_from` are
// sent as null when emptied, because the backend writes exactly the fields a
// request carries: leaving a cleared box out of the body is how the old value
// comes back on the next reload while the screen shows it gone.
const header = (v) => ({
  title: text(v.title),
  summary: text(v.summary) || null,
  effective_from: v.effectiveFrom || null,
});

// A date box gives "2026-11-10"; the column is a naive UTC datetime, and the
// backend only wants the day the policy starts applying.
const dayOf = (value) => (/^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? value : null);

const body = (v) => ({
  ...header(v),
  effective_from: dayOf(v.effectiveFrom),
  content: toWire(v.sections),
});

export async function listDocuments({ type = '', status = '', q = '' } = {}) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  try {
    const res = await a.api.get(LEGAL, {
      limit: 200,
      doc_type: type || undefined,
      status: status || undefined,
      q: q || undefined,
    });
    return { documents: res?.items ?? [], total: res?.total ?? 0 };
  } catch (error) {
    return { error: error.message || 'Could not load the legal documents.' };
  }
}

/** Create a draft, or write one that already exists.
 *
 * Version numbers are not sent. `LegalDocumentService.create` asks the table for
 * `MAX(version) + 1` for the type, and an operator typing "2" into a box has no
 * way to know a draft numbered 2 is already sitting in the list.
 */
export async function saveDocument(code, values) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  const { profile, api } = a;

  if (!text(values.title)) {
    return { error: 'The document needs a title before it can be saved.' };
  }

  if (!rateLimit(`legal-save:${profile.id}`, 40)) {
    return { error: 'Too many saves in a minute. Try again shortly.' };
  }

  const known = CODE(code);
  const payload = body(values);

  try {
    const document = known
      ? await api.patch(`${LEGAL}/${encodeURIComponent(known)}`, payload)
      : await api.post(LEGAL, { doc_type: values.docType, ...payload });
    revalidatePath('/super-admin/legal-documents');
    return { document };
  } catch (error) {
    return { error: error.message || 'Could not save that document.' };
  }
}

/** Turn pasted English into sections on the server, and hand the result back.
 *
 * The parsing lives in the backend (`app/features/legal/sections.py`) rather
 * than in this panel: one implementation, tested, and the same rules for every
 * client. A draft with no code yet is created here, because pasting a policy
 * into nothing and losing it to a failed parse is the one outcome an operator
 * should not be able to reach.
 */
export async function importDocument(code, values, contentText) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  const { profile, api } = a;
  const textBody = text(contentText);

  if (!textBody) {
    return { error: 'Paste the document first — there is nothing to turn into sections.' };
  }

  if (!rateLimit(`legal-import:${profile.id}`, 20)) {
    return { error: 'Too many imports in a minute. Try again shortly.' };
  }

  const known = CODE(code);
  const payload = {
    ...header(values),
    effective_from: dayOf(values.effectiveFrom),
    content_text: textBody,
  };

  try {
    const document = known
      ? await api.patch(`${LEGAL}/${encodeURIComponent(known)}`, payload)
      : await api.post(LEGAL, { doc_type: values.docType, ...payload });
    revalidatePath('/super-admin/legal-documents');
    return { document };
  } catch (error) {
    return { error: error.message || 'That text could not be turned into sections.' };
  }
}

export async function publishDocument(code) {
  return transition(code, 'publish', 'Could not publish that document.');
}

export async function archiveDocument(code) {
  return transition(code, 'archive', 'Could not archive that document.');
}

async function transition(code, verb, fallback) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  const known = CODE(code);

  if (!known) {
    return { error: 'Unknown document.' };
  }

  try {
    const document = await a.api.post(
      `${LEGAL}/${encodeURIComponent(known)}/${verb}`,
      {},
    );
    revalidatePath('/super-admin/legal-documents');
    return { document };
  } catch (error) {
    return { error: error.message || fallback };
  }
}

export async function deleteDocument(code) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  const known = CODE(code);

  if (!known) {
    return { error: 'Unknown document.' };
  }

  try {
    await a.api.del(`${LEGAL}/${encodeURIComponent(known)}`);
    revalidatePath('/super-admin/legal-documents');
    return { ok: true };
  } catch (error) {
    return { error: error.message || 'Could not delete that document.' };
  }
}
