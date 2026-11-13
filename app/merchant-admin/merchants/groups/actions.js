'use server';

import { revalidatePath } from 'next/cache';
import { authorize } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rateLimit';
import {
  GROUP_CODE_PATTERN,
  GROUP_LIMITS,
  GROUP_STATUSES,
  SETTLEMENT_CYCLES,
} from '@/config/merchantGroups';

const PATH = '/api/merchants/v1';
const GROUPS = `${PATH}/groups`;
const PAGE_PATH = '/merchant-admin/merchants/groups';

const t = (value) => String(value ?? '').trim();

const guard = async (scope, perMinute = 30) => {
  const a = await authorize(['merchant_admin']);

  if (a.error) {
    return { error: a.error };
  }

  if (!rateLimit(`merchant-groups-${scope}:${a.profile.id}`, perMinute)) {
    return { error: 'Too many requests. Try again in a minute.' };
  }

  return a;
};

const rowOf = (group) => ({
  id: group.group_code,
  code: group.group_code,
  name: group.name,
  cycle: group.settlement_cycle,
  owner: group.owner_merchant_code || '',
  ownerName: group.owner_merchant_name || '',
  members: group.member_count ?? 0,
  status: group.status,
  createdAt: group.created_at,
  updatedAt: group.updated_at,
});

const memberOf = (merchant) => ({
  id: merchant.merchant_code,
  code: merchant.merchant_code,
  name: merchant.display_name || merchant.legal_name,
  legalName: merchant.legal_name,
  status: merchant.status,
  kycStatus: merchant.kyc_status,
  onboardingStatus: merchant.onboarding_status,
  phone: merchant.phone || '',
  email: merchant.email || '',
});

// Every group, bounded the same way the list endpoint is. A KPI strip that only
// counted the current page would say "3 groups" on a filtered page and "1" on
// the next one; the registry is small enough that one bounded pull is honest.
const allGroups = async (api) => {
  const rows = [];

  for (let offset = 0; offset < 1000; offset += 200) {
    const res = await api.get(GROUPS, { limit: 200, offset });
    const items = res?.items ?? [];

    rows.push(...items);

    if (items.length < 200 || rows.length >= (Number(res?.total) || 0)) break;
  }

  return rows;
};

export async function loadGroups({ q = '', status = '', page = 1, pageSize = 10 } = {}) {
  const a = await guard('list', 60);

  if (a.error) {
    return { error: a.error };
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safeSize = Math.min(100, Math.max(1, Number(pageSize) || 10));
  const params = { limit: safeSize, offset: (safePage - 1) * safeSize };
  const search = t(q).slice(0, 100);

  if (GROUP_STATUSES[status]) params.status = status;
  if (search) params.q = search;

  try {
    const list = await a.api.get(GROUPS, params);

    // The KPI strip is queue-wide, so it reads the whole (bounded) registry. If
    // that second read fails the table still renders; only the strip is blank.
    let every = [];

    try {
      every = await allGroups(a.api);
    } catch {
      every = [];
    }

    const summary = every.reduce(
      (acc, group) => {
        acc.total += 1;
        if (group.status === 'active') acc.active += 1;
        if (group.status === 'inactive') acc.inactive += 1;
        if (!group.owner_merchant_code) acc.unowned += 1;
        acc.members += group.member_count || 0;
        return acc;
      },
      { total: 0, active: 0, inactive: 0, unowned: 0, members: 0 },
    );

    return {
      rows: (list?.items ?? []).map(rowOf),
      total: list?.total ?? 0,
      page: safePage,
      pageSize: safeSize,
      summary,
    };
  } catch (error) {
    return { error: error.message || 'Could not load merchant groups.' };
  }
}

export async function loadGroupDetail(
  groupCode,
  { q = '', page = 1, pageSize = GROUP_LIMITS.membersPerPage } = {},
) {
  const a = await guard('detail', 60);

  if (a.error) {
    return { error: a.error };
  }

  const code = t(groupCode);

  if (!code) {
    return { error: 'Choose a group first.' };
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safeSize = Math.min(200, Math.max(1, Number(pageSize) || GROUP_LIMITS.membersPerPage));

  try {
    const [group, members] = await Promise.all([
      a.api.get(`${GROUPS}/${encodeURIComponent(code)}`),
      a.api.get(`${GROUPS}/${encodeURIComponent(code)}/members`, {
        limit: safeSize,
        offset: (safePage - 1) * safeSize,
        ...(t(q) ? { q: t(q).slice(0, 100) } : {}),
      }),
    ]);

    return {
      group: rowOf(group),
      rows: (members?.items ?? []).map(memberOf),
      total: members?.total ?? 0,
      page: safePage,
      pageSize: safeSize,
    };
  } catch (error) {
    return { error: error.message || 'Could not load that group.' };
  }
}

export async function searchMerchants(query) {
  const a = await guard('search', 50);

  if (a.error) {
    return { error: a.error, merchants: [] };
  }

  const text = t(query).slice(0, 100);

  try {
    const res = await a.api.get(PATH, {
      limit: 20,
      offset: 0,
      ...(text ? { q: text } : {}),
    });

    return {
      merchants: (res?.items ?? []).map((merchant) => ({
        ...memberOf(merchant),
        groupCode: merchant.group_code || '',
      })),
    };
  } catch (error) {
    return { error: error.message || 'Could not search merchants.', merchants: [] };
  }
}

const validate = (values, { creating }) => {
  const errors = {};
  const name = t(values.name);
  const code = t(values.code);
  const cycle = t(values.cycle);
  const status = t(values.status);
  const owner = t(values.owner);

  if (!name) {
    errors.name = 'The group name is required.';
  } else if (name.length > GROUP_LIMITS.name) {
    errors.name = `Keep the name under ${GROUP_LIMITS.name} characters.`;
  }

  if (creating && code && !GROUP_CODE_PATTERN.test(code)) {
    errors.code =
      'Use letters, digits, dot, underscore or hyphen, up to 40 characters — or leave it blank.';
  }

  if (!SETTLEMENT_CYCLES[cycle]) {
    errors.cycle = 'Choose the settlement cycle agreed for this group.';
  }

  if (!GROUP_STATUSES[status]) {
    errors.status = 'Choose Active or Inactive.';
  }

  if (owner && !/^[A-Za-z0-9-]{1,40}$/.test(owner)) {
    errors.owner = 'Pick the owner from the merchant search, or leave it blank.';
  }

  return errors;
};

export async function createGroup(values) {
  const a = await guard('create', 20);

  if (a.error) {
    return { error: a.error };
  }

  const errors = validate(values, { creating: true });

  if (Object.keys(errors).length) {
    return { fieldErrors: errors };
  }

  const code = t(values.code);
  const owner = t(values.owner);

  try {
    await a.api.post(GROUPS, {
      name: t(values.name),
      settlement_cycle: t(values.cycle),
      status: t(values.status),
      ...(code ? { group_code: code } : {}),
      ...(owner ? { owner_merchant_code: owner } : {}),
    });
  } catch (error) {
    if (error.status === 409) {
      return { fieldErrors: { code: 'That group code is already in use.' } };
    }

    if (error.status === 404) {
      return {
        fieldErrors: {
          owner: 'That owner merchant no longer exists. Search again or leave it blank.',
        },
      };
    }

    return { error: error.message || 'Could not create the group.' };
  }

  revalidatePath(PAGE_PATH);

  return { ok: true };
}

export async function updateGroup(groupCode, values) {
  const a = await guard('update', 30);

  if (a.error) {
    return { error: a.error };
  }

  const code = t(groupCode);

  if (!code) {
    return { error: 'Choose a group first.' };
  }

  const errors = validate(values, { creating: false });

  if (Object.keys(errors).length) {
    return { fieldErrors: errors };
  }

  const owner = t(values.owner);

  try {
    await a.api.patch(`${GROUPS}/${encodeURIComponent(code)}`, {
      name: t(values.name),
      settlement_cycle: t(values.cycle),
      status: t(values.status),
      // An empty owner box means "no owner", so this is explicitly null rather
      // than omitted; omitting it would leave the old lead account on the row.
      owner_merchant_code: owner || null,
    });
  } catch (error) {
    if (error.status === 404) {
      return {
        fieldErrors: {
          owner: 'That owner merchant no longer exists. Search again or clear the box.',
        },
      };
    }

    return { error: error.message || 'Could not update the group.' };
  }

  revalidatePath(PAGE_PATH);

  return { ok: true };
}

export async function deleteGroup(groupCode) {
  const a = await guard('delete', 20);

  if (a.error) {
    return { error: a.error };
  }

  const code = t(groupCode);

  if (!code) {
    return { error: 'Choose a group first.' };
  }

  try {
    await a.api.del(`${GROUPS}/${encodeURIComponent(code)}`);
  } catch (error) {
    if (error.status === 409) {
      return {
        error:
          'This group still has members. Remove them from the group (or move them to another ' +
          'group) before deleting it.',
      };
    }

    return { error: error.message || 'Could not delete the group.' };
  }

  revalidatePath(PAGE_PATH);

  return { ok: true };
}

export async function addGroupMember(groupCode, merchantCode) {
  const a = await guard('member-add', 40);

  if (a.error) {
    return { error: a.error };
  }

  const code = t(groupCode);
  const merchant = t(merchantCode);

  if (!code || !merchant) {
    return { error: 'Choose a group and a merchant.' };
  }

  try {
    const group = await a.api.post(`${GROUPS}/${encodeURIComponent(code)}/members`, {
      merchant_codes: [merchant],
    });

    revalidatePath(PAGE_PATH);

    return { ok: true, group: rowOf(group) };
  } catch (error) {
    if (error.status === 409) {
      return { error: error.message || 'That merchant is already in another group.' };
    }

    return { error: error.message || 'Could not add that merchant to the group.' };
  }
}

export async function removeGroupMember(groupCode, merchantCode) {
  const a = await guard('member-remove', 40);

  if (a.error) {
    return { error: a.error };
  }

  const code = t(groupCode);
  const merchant = t(merchantCode);

  if (!code || !merchant) {
    return { error: 'Choose a group and a merchant.' };
  }

  try {
    const group = await a.api.del(
      `${GROUPS}/${encodeURIComponent(code)}/members/${encodeURIComponent(merchant)}`,
    );

    revalidatePath(PAGE_PATH);

    return { ok: true, group: rowOf(group) };
  } catch (error) {
    return { error: error.message || 'Could not remove that merchant from the group.' };
  }
}
