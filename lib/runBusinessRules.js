import { ObjectId } from 'mongodb'
import { selectMatchingRules, buildActionEffects } from '@/lib/businessRules'
import { notifyUser } from '@/lib/notify'
import { logAudit } from '@/lib/auditLog'

// Loads applicable rules, evaluates them against `entity`, applies matched field updates to
// `collectionName`/`entityId`, and executes NOTIFY/ESCALATE side effects. Returns the list of
// rules that fired, for the caller to log/report. Failures are caught per-rule so one bad rule
// can't block the others or the caller's own mutation.
export async function runBusinessRules(db, { collectionName, entityType, trigger, entityId, entity }) {
  const rules = await db.collection('BusinessRule').find({ entityType, trigger, enabled: true }).toArray()
  if (rules.length === 0) return []

  const matched = selectMatchingRules(entity, rules.map((r) => ({ ...r, id: r._id.toString() })), trigger)
  const fired = []

  for (const rule of matched) {
    try {
      const { fieldUpdates, sideEffects } = buildActionEffects(rule.actions)

      if (Object.keys(fieldUpdates).length > 0) {
        await db
          .collection(collectionName)
          .updateOne({ _id: new ObjectId(entityId) }, { $set: { ...fieldUpdates, modifyDate: new Date() } })
        Object.assign(entity, fieldUpdates)
      }

      for (const effect of sideEffects) {
        if (effect.type === 'NOTIFY' && effect.userId) {
          await notifyUser(db, {
            userId: effect.userId,
            type: 'BUSINESS_RULE',
            title: `Rule triggered: ${rule.name}`,
            message: effect.message || `${entityType} matched rule "${rule.name}"`,
            link: effect.link || null,
          })
        }
        // ESCALATE and other action types are recorded via audit log below even when there's no
        // dedicated handler yet, so the rule's effect is still visible/traceable.
      }

      await logAudit(db, {
        action: 'BUSINESS_RULE_FIRED',
        entityType,
        entityId,
        entityLabel: rule.name,
        user: { email: 'system' },
        req: null,
        changes: Object.entries(fieldUpdates).map(([field, newValue]) => ({ field, oldValue: null, newValue })),
        reason: `Rule ${rule.ruleId || rule.id}`,
      })

      fired.push(rule.name)
    } catch (e) {
      console.error(`business rule "${rule.name}" failed:`, e.message)
    }
  }

  return fired
}
