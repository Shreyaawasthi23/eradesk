import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { DEFAULT_BUSINESS_HOURS, calculateSlaDeadline } from '@/lib/slaEngine'
import { ObjectId } from 'mongodb'
import { serializeHoliday, serializeSlaPolicy } from '@/lib/serializers'
import { nextSequence } from '@/lib/sequence'

async function businessHoursGet(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { db } = auth
  const config = await db.collection('BusinessHours').findOne({ _id: 'config' })

  return res.status(200).json(
    config
      ? { workDays: config.workDays, startMinute: config.startMinute, endMinute: config.endMinute, timezone: config.timezone }
      : { ...DEFAULT_BUSINESS_HOURS, timezone: 'UTC' },
  )
}

async function businessHoursSet(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) {
    return res.status(403).end()
  }

  const { db } = auth
  const { workDays, startMinute, endMinute, timezone } = req.body || {}

  if (!Array.isArray(workDays) || workDays.length === 0) {
    return res.status(200).json({ statusCode: 409, message: 'workDays must be a non-empty array of 0-6' })
  }
  if (workDays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
    return res.status(200).json({ statusCode: 409, message: 'workDays values must be integers 0-6' })
  }
  const start = Number(startMinute)
  const end = Number(endMinute)
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > 1440 || start >= end) {
    return res.status(200).json({ statusCode: 409, message: 'startMinute must be less than endMinute, within 0-1440' })
  }

  await db.collection('BusinessHours').updateOne(
    { _id: 'config' },
    { $set: { workDays, startMinute: start, endMinute: end, timezone: timezone || 'UTC', modifyDate: new Date() } },
    { upsert: true },
  )

  return res.status(200).json({ statusCode: 200, message: 'Business hours updated' })
}

// Computes response and resolution deadlines for a given entity type + priority, using the
// tenant's configured business hours, holidays, and the matching active SLA policy. This is the
// real engine — separate from lib/incidentId.js's SlaTracker elapsed-time calculator, which
// tracks time already spent, not a target deadline.
async function calculateDeadline(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { db } = auth
  const { entityType, priority, startDate } = req.body || {}

  if (!entityType || !Number.isInteger(priority)) {
    return res.status(200).json({ statusCode: 409, message: 'entityType and integer priority are required' })
  }

  const policy = await db.collection('SLAPolicy').findOne({ entityType, active: true })
  if (!policy) {
    return res.status(200).json({ statusCode: 409, message: `No active SLA policy configured for ${entityType}` })
  }

  const target = policy.targets.find((t) => t.priority === priority)
  if (!target) {
    return res.status(200).json({ statusCode: 409, message: `Policy "${policy.name}" has no target for priority ${priority}` })
  }

  const businessHoursDoc = await db.collection('BusinessHours').findOne({ _id: 'config' })
  const businessHours = businessHoursDoc
    ? { workDays: businessHoursDoc.workDays, startMinute: businessHoursDoc.startMinute, endMinute: businessHoursDoc.endMinute }
    : DEFAULT_BUSINESS_HOURS

  const holidays = (await db.collection('Holiday').find({}).toArray()).map((h) => h.date)

  const start = startDate ? new Date(startDate) : new Date()
  const responseDeadline = calculateSlaDeadline(start, target.responseMinutes, businessHours, holidays)
  const resolutionDeadline = calculateSlaDeadline(start, target.resolutionMinutes, businessHours, holidays)

  return res.status(200).json({
    policyId: policy._id.toString(),
    policyName: policy.name,
    responseDeadline,
    resolutionDeadline,
  })
}

async function holidayCreate(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) {
    return res.status(403).end()
  }

  const { db } = auth
  const { date, name } = req.body || {}

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(200).json({ statusCode: 409, message: 'date must be in YYYY-MM-DD format' })
  }

  const existing = await db.collection('Holiday').findOne({ date })
  if (existing) {
    return res.status(200).json({ statusCode: 409, message: 'A holiday is already set for this date' })
  }

  const result = await db.collection('Holiday').insertOne({ date, name: name || '' })

  return res.status(200).json({ statusCode: 200, message: 'Holiday added', id: result.insertedId.toString() })
}

async function holidayDelete(req, res) {
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

  const result = await db.collection('Holiday').deleteOne({ _id: new ObjectId(id) })
  if (!result.deletedCount) {
    return res.status(200).json({ statusCode: 409, message: 'Holiday not found' })
  }

  return res.status(200).json({ statusCode: 200, message: 'Holiday removed' })
}

async function holidayGetAll(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { db } = auth
  const holidays = await db.collection('Holiday').find({}).sort({ date: 1 }).toArray()

  return res.status(200).json(holidays.map(serializeHoliday))
}

// targets: [{ priority: number, responseMinutes: number, resolutionMinutes: number }, ...]
async function policyCreate(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { db, user } = auth
  const { name, entityType, targets } = req.body || {}

  if (!name || !entityType || !Array.isArray(targets) || targets.length === 0) {
    return res.status(200).json({ statusCode: 409, message: 'name, entityType, and at least one target are required' })
  }
  for (const t of targets) {
    if (!Number.isInteger(t.priority) || !(t.responseMinutes > 0) || !(t.resolutionMinutes > 0)) {
      return res.status(200).json({
        statusCode: 409,
        message: 'Each target needs an integer priority and positive responseMinutes/resolutionMinutes',
      })
    }
  }

  const seq = await nextSequence(db, 'SlaPolicySequence', 'sla_policy_sequence')
  const policyId = `SLA-${String(seq).padStart(6, '0')}`
  const now = new Date()

  const newPolicy = {
    policyId,
    name,
    entityType,
    targets,
    active: true,
    createDate: now,
    modifyDate: now,
    userId: user._id.toString(),
    userEmail: user.email,
  }

  const result = await db.collection('SLAPolicy').insertOne(newPolicy)

  return res
    .status(200)
    .json({ statusCode: 200, message: `SLA policy created ${policyId}`, id: result.insertedId.toString() })
}

async function policyGetAll(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { db } = auth
  const { entityType } = req.query
  const filter = entityType ? { entityType } : {}

  const policies = await db.collection('SLAPolicy').find(filter).sort({ createDate: -1 }).toArray()

  return res.status(200).json(policies.map(serializeSlaPolicy))
}

export default {
  'business-hours-get': businessHoursGet,
  'business-hours-set': businessHoursSet,
  'calculate-deadline': calculateDeadline,
  'holiday-create': holidayCreate,
  'holiday-delete': holidayDelete,
  'holiday-get-all': holidayGetAll,
  'policy-create': policyCreate,
  'policy-get-all': policyGetAll,
}
