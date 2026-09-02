import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'
import { ObjectId } from 'mongodb'
import { serializeBusinessRule } from '@/lib/serializers'
import { toPageResponse } from '@/lib/pagination'
import { evaluateConditions } from '@/lib/businessRules'

const TRIGGERS = ['ON_CREATE', 'ON_UPDATE', 'ON_STATUS_CHANGE']
const OPERATORS = ['EQUALS', 'NOT_EQUALS', 'CONTAINS', 'NOT_CONTAINS', 'STARTS_WITH', 'ENDS_WITH', 'GREATER_THAN', 'LESS_THAN', 'REGEX']
const ACTION_TYPES = ['SET_FIELD', 'ASSIGN_GROUP', 'NOTIFY', 'ESCALATE']

async function create(req, res) {
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

async function edit(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) {
    return res.status(403).end()
  }

  const { id } = req.query
  const { db } = auth
  const { name, conditions, actions, priority, enabled, continueAfterMatch } = req.body || {}

  const existing = await db.collection('BusinessRule').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Business rule not found' })
  }

  const update = {
    name: name ?? existing.name,
    conditions: conditions ?? existing.conditions,
    actions: actions ?? existing.actions,
    priority: Number.isInteger(priority) ? priority : existing.priority,
    enabled: enabled !== undefined ? enabled : existing.enabled,
    continueAfterMatch: continueAfterMatch !== undefined ? continueAfterMatch : existing.continueAfterMatch,
    modifyDate: new Date(),
  }

  await db.collection('BusinessRule').updateOne({ _id: new ObjectId(id) }, { $set: update })

  return res.status(200).json({ statusCode: 200, message: 'Business rule updated successfully' })
}

async function getAllPage(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { entityType } = req.query
  const { db } = auth

  const filter = {}
  if (entityType) filter.entityType = entityType

  const totalElements = await db.collection('BusinessRule').countDocuments(filter)
  const items = await db
    .collection('BusinessRule')
    .find(filter)
    .sort({ entityType: 1, priority: 1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeBusinessRule), totalElements, page, size))
}

// Dry-run: evaluates a set of conditions against a sample entity without persisting or
// executing anything, so the rule builder UI can show "would this match?" live.
async function test(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) {
    return res.status(403).end()
  }

  const { conditions, sampleEntity } = req.body || {}
  if (typeof sampleEntity !== 'object' || sampleEntity === null) {
    return res.status(200).json({ statusCode: 409, message: 'sampleEntity object is required' })
  }

  const matches = evaluateConditions(sampleEntity, conditions || [])

  return res.status(200).json({ matches })
}

export default {
  'create': create,
  'edit': edit,
  'get-all-page': getAllPage,
  'test': test,
}
