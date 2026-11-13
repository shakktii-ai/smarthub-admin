'use server';

import { revalidatePath } from 'next/cache';
import { authorize } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rateLimit';

const CAMPAIGNS = '/api/super-admin/v1/campaigns';

// Audiences are device sets in the backend, and a narrowed one needs a code that
// exists. These three lists are what the composer offers to pick from, so an
// operator cannot type a branch code from memory and greet nobody.
const AUDIENCE_SOURCES = {
  branch: { path: '/api/branches/v1', code: 'branch_code' },
  group: { path: '/api/merchants/v1/groups', code: 'group_code' },
  category: { path: '/api/merchants/v1/categories', code: 'category_code' },
};

const REF = (value) => {
  const ref = String(value || '').trim();
  return ref && ref.length <= 40 ? ref : null;
};

// Only the fields the create/update schema knows about. Sending anything else is
// how a form silently starts failing validation after the backend grows a field.
const pick = (v) => ({
  name: String(v.name || '').trim(),
  kind: v.kind || 'general',
  title: String(v.title || '').trim(),
  body: String(v.body || '').trim(),
  image_url: String(v.imageUrl || '').trim() || null,
  deep_link: String(v.deepLink || '').trim() || null,
  audience: v.audience || 'all_merchants',
  audience_code: String(v.audienceCode || '').trim() || null,
  channel: CHANNEL(v.channel),
});

// The medium vocabulary lives in the backend, so this only shapes the value into
// a query-parameter-safe slug; an unknown one is the API's to refuse.
const CHANNEL = (value) => {
  const channel = String(value || '').trim().toLowerCase();
  return channel || 'push';
};

export async function listCampaigns() {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  try {
    const res = await a.api.get(CAMPAIGNS, { limit: 100 });
    return { campaigns: res?.items ?? [], total: res?.total ?? 0 };
  } catch (error) {
    return { error: error.message || 'Could not load the campaigns.' };
  }
}

export async function audienceOptions(audience) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  const source = AUDIENCE_SOURCES[audience];
  if (!source) {
    return { options: [] };
  }

  try {
    const res = await a.api.get(source.path, { limit: 200, status: 'active' });
    return {
      options: (res?.items ?? []).map((row) => ({
        code: String(row[source.code] ?? ''),
        name: row.name || '',
      })),
    };
  } catch (error) {
    return { error: error.message || 'Could not load the audience list.' };
  }
}

// The Medium dropdown is filled from the backend, not from a list written here:
// what a channel is called, what it addresses, whether it is billed and whether
// it needs marketing consent are rules the send enforces, and a composer that
// invented its own copy would be describing a control it does not have.
export async function channelOptions() {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  try {
    const res = await a.api.get(`${CAMPAIGNS}/channels`);
    return { channels: res?.items ?? [], default: res?.default || 'push' };
  } catch (error) {
    return { error: error.message || 'Could not load the delivery media.' };
  }
}

export async function previewAudience(audience, audienceCode, channel) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  const code = String(audienceCode || '').trim();
  if (audience !== 'all_merchants' && !code) {
    return { error: 'Pick which branch, group, category or merchant to reach.' };
  }

  try {
    const preview = await a.api.get(`${CAMPAIGNS}/recipients`, {
      audience,
      audience_code: audience === 'all_merchants' ? undefined : code,
      channel: CHANNEL(channel),
    });
    return { preview };
  } catch (error) {
    return { error: error.message || 'Could not count that audience on this medium.' };
  }
}

export async function saveCampaign(ref, values) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  const { profile, api } = a;
  const body = pick(values);

  if (!body.name || !body.title || !body.body) {
    return { error: 'Name, title and message are all required.' };
  }

  if (!rateLimit(`campaign-save:${profile.id}`, 40)) {
    return { error: 'Too many requests. Try again in a minute.' };
  }

  const known = REF(ref);

  try {
    const campaign = known
      ? await api.patch(`${CAMPAIGNS}/${encodeURIComponent(known)}`, body)
      : await api.post(CAMPAIGNS, body);
    revalidatePath('/super-admin/campaigns');
    return { campaign };
  } catch (error) {
    return { error: error.message || 'Could not save the campaign.' };
  }
}

export async function deleteCampaign(ref) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  const known = REF(ref);

  if (!known) {
    return { error: 'Unknown campaign.' };
  }

  try {
    await a.api.del(`${CAMPAIGNS}/${encodeURIComponent(known)}`);
    revalidatePath('/super-admin/campaigns');
    return { ok: true };
  } catch (error) {
    return { error: error.message || 'Could not delete the campaign.' };
  }
}

export async function sendBatch(ref, batch = 200) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  const { profile, api } = a;
  const known = REF(ref);

  if (!known) {
    return { error: 'Unknown campaign.' };
  }

  if (!rateLimit(`campaign-send:${profile.id}`, 120)) {
    return { error: 'Too many requests. Try again in a minute.' };
  }

  const size = Math.min(1000, Math.max(1, Number(batch) || 200));

  try {
    const report = await api.post(
      `${CAMPAIGNS}/${encodeURIComponent(known)}/send`,
      { batch: size },
    );
    revalidatePath('/super-admin/campaigns');
    return { report };
  } catch (error) {
    return { error: error.message || 'Could not send that batch.' };
  }
}

export async function cancelCampaign(ref) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  const known = REF(ref);

  if (!known) {
    return { error: 'Unknown campaign.' };
  }

  try {
    const campaign = await a.api.post(
      `${CAMPAIGNS}/${encodeURIComponent(known)}/cancel`,
      {},
    );
    revalidatePath('/super-admin/campaigns');
    return { campaign };
  } catch (error) {
    return { error: error.message || 'Could not cancel the campaign.' };
  }
}

export async function listDeliveries(ref, status) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error };
  }

  const known = REF(ref);

  if (!known) {
    return { error: 'Unknown campaign.' };
  }

  try {
    const res = await a.api.get(
      `${CAMPAIGNS}/${encodeURIComponent(known)}/deliveries`,
      { limit: 100, status: status || undefined },
    );
    return {
      deliveries: res?.items ?? [],
      total: res?.total ?? 0,
      channel: res?.channel || 'push',
    };
  } catch (error) {
    return { error: error.message || 'Could not load the delivery log.' };
  }
}
