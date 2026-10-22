import 'server-only';

// Best-effort audit trail. Never put PAN, bank numbers or document paths in `details`.
export async function audit(admin, actor, action, entityType, entityId, details = {}) {
  const { error } = await admin.from('audit_logs').insert({ actor_id: actor.id, actor_name: actor.full_name, action, entity_type: entityType, entity_id: String(entityId || ''), details });
  if (error) console.error('audit log failed', action, error.code);
}
