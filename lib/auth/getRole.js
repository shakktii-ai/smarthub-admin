import { AUTH, ROLES } from '@/config/auth';

// Reads the role from the database (never from the client). Returns null if missing, unknown or inactive.
export async function getRoleForUser(supabase, userId) {
  const { data, error } = await supabase.from(AUTH.profileTable).select(`${AUTH.roleColumn}, ${AUTH.activeColumn}`).eq('id', userId).maybeSingle();
  if (error || !data || data[AUTH.activeColumn] === false) return null;
  const role = data[AUTH.roleColumn];
  return ROLES[role] ? role : null;
}
