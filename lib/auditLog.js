// Shared audit-trail writer. Call from any API route after a mutation to record who changed
// what, mirroring the spec's "old value -> new value" audit requirement. Non-blocking by design
// (failures are swallowed) so a logging hiccup never breaks the actual operation being audited.
export async function logAudit(db, { action, entityType, entityId, entityLabel, user, req, changes, reason }) {
  try {
    const ipAddress =
      (req?.headers?.['x-forwarded-for'] || '').split(',')[0].trim() || req?.socket?.remoteAddress || ''

    await db.collection('AuditLog').insertOne({
      action,
      entityType,
      entityId: entityId != null ? String(entityId) : null,
      entityLabel: entityLabel || '',
      userId: user?._id ? user._id.toString() : null,
      userEmail: user?.email || 'system',
      ipAddress,
      changes: changes || [],
      reason: reason || '',
      timestamp: new Date(),
    })
  } catch (e) {
    console.error('audit log write failed:', e.message)
  }
}

// Diffs two plain objects over a given field list, returning only the fields that changed
// as { field, oldValue, newValue } entries — the shape logAudit's `changes` expects.
export function diffFields(before, after, fields) {
  const changes = []
  for (const field of fields) {
    const oldValue = before?.[field]
    const newValue = after?.[field]
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.push({ field, oldValue: oldValue ?? null, newValue: newValue ?? null })
    }
  }
  return changes
}
