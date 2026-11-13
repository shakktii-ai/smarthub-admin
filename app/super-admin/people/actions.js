'use server';

import { authorize } from '@/lib/auth/session';
import { rateLimit } from '@/lib/rateLimit';

const USERS = '/api/identity/v1/users';

const clean = (value, max) => {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, max) : null;
};

// One directory search for the pickers on Approvals and the Risk Center. It is
// deliberately bounded to 20 rows: the operator is choosing a person, not
// downloading the user table. `roles` comes back as the backend stores it, so a
// picker can show why someone is eligible.
export async function searchPeople(query) {
  const a = await authorize(['super_admin']);

  if (a.error) {
    return { error: a.error, people: [] };
  }

  const text = clean(query, 100);
  if (!rateLimit(`people-search:${a.profile.id}`, 40)) {
    return { error: 'Too many searches. Try again in a minute.', people: [] };
  }

  try {
    const res = await a.api.get(USERS, {
      limit: 20,
      ...(text ? { q: text } : {}),
    });
    return {
      people: (res?.items ?? []).map((user) => ({
        id: user.id,
        name: user.full_name || user.email,
        email: user.email,
        roles: user.roles || [],
      })),
    };
  } catch (error) {
    return { error: error.message || 'Could not search the user directory.', people: [] };
  }
}
