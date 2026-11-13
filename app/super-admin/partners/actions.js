'use server';

import { revalidatePath } from 'next/cache';
import { authorize } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rateLimit';
import { PARTNER_STATUSES, PARTNER_TYPES } from '@/config/partners';

const PATH = '/api/partners/v1';

const t = (x) => String(x ?? '').trim();

// The backend stores the code as the audit and link key, so an operator who types one must not
// be able to store a space or a slash in it; leaving it blank is what asks for a generated one.
const CODE_PATTERN = /^[A-Za-z0-9._-]{1,40}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validate = (values, { code }) => {
  const errors = {};
  const name = t(values.name);

  if (!name) {
    errors.name = 'The partner name is required.';
  } else if (name.length > 255) {
    errors.name = 'Keep the name under 255 characters.';
  }

  if (!PARTNER_TYPES[values.type]) {
    errors.type = 'Please select what this partner does for us.';
  }

  if (!PARTNER_STATUSES[values.status]) {
    errors.status = 'Please select a status.';
  }

  if (code && !CODE_PATTERN.test(code)) {
    errors.code =
      'Use letters, digits, dot, underscore or hyphen, up to 40 characters — or leave it blank.';
  }

  const email = t(values.email);

  if (email && !EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email address.';
  }

  const phone = t(values.phone).replace(/[\s+-]/g, '');

  if (phone && !/^\d{6,15}$/.test(phone)) {
    errors.phone = 'Digits only, 6 to 15 of them (10 for an Indian mobile).';
  }

  if (t(values.contact).length > 255) {
    errors.contact = 'Keep the contact name under 255 characters.';
  }

  return { errors, body: { email, phone } };
};

const guard = async (scope) => {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  if (!rateLimit(`partners-${scope}:${a.profile.id}`, 30)) {
    return { error: 'Too many requests. Try again in a minute.' };
  }

  return a;
};

export async function listPartners({
  q = '',
  type = '',
  status = '',
  page = 1,
  pageSize = 10,
} = {}) {
  const a = await guard('list');

  if (a.error) {
    return { error: a.error };
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 10));

  const params = { limit: safePageSize, offset: (safePage - 1) * safePageSize };

  // The endpoint filters on the stored snake_case value, not on the dashboard label.
  if (PARTNER_TYPES[type]) params.partner_type = type;
  if (PARTNER_STATUSES[status]) params.status = status;

  const search = t(q).slice(0, 100);

  if (search) params.q = search;

  try {
    const list = await a.api.get(PATH, params);

    return {
      rows: (list.items || []).map((p) => ({
        id: p.partner_code,
        name: p.name,
        type: p.partner_type,
        status: p.status,
        contact: p.contact_name,
        email: p.contact_email,
        phone: p.contact_phone,
        created_at: p.created_at,
        updated_at: p.updated_at,
      })),
      total: list.total || 0,
      page: safePage,
      pageSize: safePageSize,
    };
  } catch (error) {
    return { error: error.message || 'Could not load partners.' };
  }
}

export async function createPartner(values) {
  const a = await guard('create');

  if (a.error) {
    return { error: a.error };
  }

  const code = t(values.code);
  const { errors, body } = validate(values, { code });

  if (Object.keys(errors).length) {
    return { fieldErrors: errors };
  }

  try {
    await a.api.post(PATH, {
      partner_code: code || undefined,
      name: t(values.name),
      partner_type: values.type,
      status: values.status,
      contact_name: t(values.contact) || undefined,
      contact_email: body.email || undefined,
      contact_phone: body.phone || undefined,
    });
  } catch (error) {
    if (error.status === 409) {
      return {
        fieldErrors: { code: 'That partner code is already in use.' },
      };
    }
    return { error: error.message || 'Could not create the partner.' };
  }

  revalidatePath('/super-admin/partners');

  return { ok: true };
}

export async function updatePartner(id, values) {
  const a = await guard('update');

  if (a.error) {
    return { error: a.error };
  }

  if (!t(id)) {
    return { error: 'Invalid partner.' };
  }

  const { errors, body } = validate(values, { code: '' });

  if (Object.keys(errors).length) {
    return { fieldErrors: errors };
  }

  try {
    await a.api.patch(`${PATH}/${encodeURIComponent(id)}`, {
      name: t(values.name),
      partner_type: values.type,
      status: values.status,
      contact_name: t(values.contact) || null,
      contact_email: body.email || null,
      contact_phone: body.phone || null,
    });
  } catch (error) {
    if (error.status === 404) {
      return { error: 'That partner no longer exists. Reload the list.' };
    }
    return { error: error.message || 'Could not update the partner.' };
  }

  revalidatePath('/super-admin/partners');

  return { ok: true };
}

// The backend hard-deletes the row; the audit event keeps the summary, so the trail still
// shows what was removed. That is the honest wording for the confirm dialog.
export async function deletePartner(id) {
  const a = await guard('delete');

  if (a.error) {
    return { error: a.error };
  }

  if (!t(id)) {
    return { error: 'Invalid partner.' };
  }

  try {
    await a.api.del(`${PATH}/${encodeURIComponent(id)}`);
  } catch (error) {
    if (error.status === 404) {
      return { error: 'That partner no longer exists. Reload the list.' };
    }
    return { error: error.message || 'Could not delete the partner.' };
  }

  revalidatePath('/super-admin/partners');

  return { ok: true };
}
