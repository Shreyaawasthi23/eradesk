import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'

const TRIGGERS = ['ON_CREATE', 'ON_UPDATE', 'ON_STATUS_CHANGE']
const OPERATORS = ['EQUALS', 'NOT_EQUALS', 'CONTAINS', 'NOT_CONTAINS', 'STARTS_WITH', 'ENDS_WITH', 'GREATER_THAN', 'LESS_THAN', 'REGEX']
const ACTION_TYPES = ['SET_FIELD', 'ASSIGN_GROUP', 'NOTIFY', 'ESCALATE']

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) {
    return res.status(403).end()
  }

  const { db, user } = auth
  const { name, entityType, trigger, conditions, actions, priority, enabled, continueAfterMatch } = req.body || {}

  if (!name || !entityType || !trigger || !Array.isArray(actions) || actions.length === 0) {
    return res.status(200).json({ statusCode: 409, message: 'name, entityType, trigger, and at least one action are required' })
  }
  if (!TRIGGERS.includes(trigger)) {
    return res.status(200).json({ statusCode: 409, message: 'Invalid trigger' })
  }
  for (const c of conditions || []) {
    if (!c.field || !OPERATORS.includes(c.operator)) {
      return res.status(200).json({ statusCode: 409, message: 'Each condition needs a field and valid operator' })
    }
  }
  for (const a of actions) {
    if (!ACTION_TYPES.includes(a.type)) {
      return res.status(200).json({ statusCode: 409, message: 'Invalid action type' })
    }
    if (a.type === 'SET_FIELD' && !a.field) {
      return res.status(200).json({ statusCode: 409, message: 'SET_FIELD actions need a field name' })
    }
  }

  const seq = await nextSequence(db, 'BusinessRuleSequence', 'business_rule_sequence')
  const ruleId = `RULE-${String(seq).padStart(6, '0')}`
  const now = new Date()

  const newRule = {
    ruleId,
    name,
    entityType,
    trigger,
    conditions: conditions || [],
    actions,
    priority: Number.isInteger(priority) ? priority : 0,
    enabled: enabled !== false,
    continueAfterMatch: continueAfterMatch !== false,
    createDate: now,
    modifyDate: now,
    userId: user._id.toString(),
    userEmail: user.email,
  }

  const result = await db.collection('BusinessRule').insertOne(newRule)

  return res
    .status(200)
    .json({ statusCode: 200, message: `Business rule created ${ruleId}`, id: result.insertedId.toString() })
}
