import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'
import { logAudit } from '@/lib/auditLog'
import { serializeChange, serializeIncident, serializeProblem } from '@/lib/serializers'
import { toPageResponse } from '@/lib/pagination'

const TYPES = ['STANDARD', 'NORMAL', 'EMERGENCY']

async function create(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { db, user } = auth
  const {
    title, description, type, priority, riskLevel, impactAnalysis,
    implementationPlan, backoutPlan, testPlan, scheduledStart, scheduledEnd,
    engineerId, workGroup, linkedIncidentIds, linkedProblemIds,
  } = req.body || {}

  if (!title || !description) {
    return res.status(200).json({ statusCode: 409, message: 'Title and description are required' })
  }
  if (type && !TYPES.includes(type)) {
    return res.status(200).json({ statusCode: 409, message: 'Invalid change type' })
  }

  const incidentIds = Array.isArray(linkedIncidentIds) ? linkedIncidentIds : []
  const problemIds = Array.isArray(linkedProblemIds) ? linkedProblemIds : []

  if (incidentIds.length) {
    const found = await db
      .collection('Incident')
      .countDocuments({ _id: { $in: incidentIds.map((id) => new ObjectId(id)) } })
    if (found !== incidentIds.length) {
      return res.status(200).json({ statusCode: 409, message: 'One or more linked incidents were not found' })
    }
  }
  if (problemIds.length) {
    const found = await db
      .collection('Problem')
      .countDocuments({ _id: { $in: problemIds.map((id) => new ObjectId(id)) } })
    if (found !== problemIds.length) {
      return res.status(200).json({ statusCode: 409, message: 'One or more linked problems were not found' })
    }
  }

  const seq = await nextSequence(db, 'ChangeSequence', 'change_sequence')
  const changeId = `CHG-${String(seq).padStart(6, '0')}`
  const now = new Date()
  const changeType = type || 'NORMAL'

  const newChange = {
    changeId,
    title,
    description,
    type: changeType,
    priority: priority || 3,
    riskLevel: riskLevel || 'MEDIUM',
    // Standard changes are pre-approved (low-risk, repeatable) so they skip CAB and start ready
    // to schedule; Normal/Emergency changes require explicit CAB approval before scheduling.
    status: changeType === 'STANDARD' ? 'APPROVED' : 'DRAFT',
    impactAnalysis: impactAnalysis || '',
    implementationPlan: implementationPlan || '',
    backoutPlan: backoutPlan || '',
    testPlan: testPlan || '',
    scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
    scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
    linkedIncidentIds: incidentIds,
    linkedProblemIds: problemIds,
    approvals: [],
    engineerId: engineerId || null,
    workGroup: workGroup || null,
    closureNotes: '',
    reviewNotes: '',
    createDate: now,
    modifyDate: now,
    closeDate: null,
    userId: user._id.toString(),
    userEmail: user.email,
  }

  const result = await db.collection('Change').insertOne(newChange)

  if (problemIds.length) {
    await db
      .collection('Problem')
      .updateMany(
        { _id: { $in: problemIds.map((id) => new ObjectId(id)) } },
        { $addToSet: { linkedChangeIds: result.insertedId.toString() } },
      )
  }

  return res
    .status(200)
    .json({ statusCode: 200, message: `Change created ${changeId}`, id: result.insertedId.toString() })
}

// CAB decision: only ROLE_ADMIN or ROLE_MODERATOR (acting as CAB members) may approve/reject —
// mirrors the spec's "only authorized technician/CAB users should be able to approve changes".
async function decide(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { id } = req.query
  const { db, user } = auth
  const { decision, comment } = req.body || {}

  if (!['APPROVED', 'REJECTED'].includes(decision)) {
    return res.status(200).json({ statusCode: 409, message: 'decision must be APPROVED or REJECTED' })
  }

  const existing = await db.collection('Change').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Change not found' })
  }
  if (existing.status !== 'PENDING_APPROVAL') {
    return res
      .status(200)
      .json({ statusCode: 409, message: `Change is not pending approval (currently ${existing.status})` })
  }

  const now = new Date()
  const approvalRecord = {
    approverId: user._id.toString(),
    approverEmail: user.email,
    decision,
    comment: comment || '',
    decidedDate: now,
  }

  await db.collection('Change').updateOne(
    { _id: new ObjectId(id) },
    {
      $push: { approvals: approvalRecord },
      $set: { status: decision, modifyDate: now },
    },
  )

  await logAudit(db, {
    action: 'CAB_DECISION',
    entityType: 'Change',
    entityId: id,
    entityLabel: existing.changeId,
    user,
    req,
    changes: [{ field: 'status', oldValue: existing.status, newValue: decision }],
    reason: comment || '',
  })

  return res.status(200).json({ statusCode: 200, message: `Change ${decision.toLowerCase()} by ${user.email}` })
}

async function edit(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { id } = req.query
  const { db } = auth
  const {
    title, description, priority, riskLevel, impactAnalysis,
    implementationPlan, backoutPlan, testPlan, scheduledStart, scheduledEnd,
    engineerId, workGroup,
  } = req.body || {}

  const existing = await db.collection('Change').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Change not found' })
  }
  const editableStatuses = ['DRAFT', 'PENDING_APPROVAL', 'REJECTED', 'APPROVED']
  if (!editableStatuses.includes(existing.status)) {
    return res
      .status(200)
      .json({ statusCode: 409, message: `Change cannot be edited while ${existing.status}` })
  }

  // Once approved, the change plan itself (what/why/risk) is locked in — only scheduling and
  // assignment may still change, since CAB signed off on the plan, not the calendar slot.
  const isApproved = existing.status === 'APPROVED'
  const update = {
    title: isApproved ? existing.title : (title ?? existing.title),
    description: isApproved ? existing.description : (description ?? existing.description),
    priority: isApproved ? existing.priority : (priority ?? existing.priority),
    riskLevel: isApproved ? existing.riskLevel : (riskLevel ?? existing.riskLevel),
    impactAnalysis: isApproved ? existing.impactAnalysis : (impactAnalysis ?? existing.impactAnalysis),
    implementationPlan: isApproved ? existing.implementationPlan : (implementationPlan ?? existing.implementationPlan),
    backoutPlan: isApproved ? existing.backoutPlan : (backoutPlan ?? existing.backoutPlan),
    testPlan: isApproved ? existing.testPlan : (testPlan ?? existing.testPlan),
    scheduledStart: scheduledStart ? new Date(scheduledStart) : existing.scheduledStart,
    scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : existing.scheduledEnd,
    engineerId: engineerId ?? existing.engineerId,
    workGroup: workGroup ?? existing.workGroup,
    modifyDate: new Date(),
  }

  await db.collection('Change').updateOne({ _id: new ObjectId(id) }, { $set: update })

  return res.status(200).json({ statusCode: 200, message: 'Change updated successfully' })
}

async function getAllPage(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { status, type } = req.query
  const { db } = auth

  const filter = {}
  if (status) filter.status = status
  if (type) filter.type = type

  const totalElements = await db.collection('Change').countDocuments(filter)
  const items = await db
    .collection('Change')
    .find(filter)
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeChange), totalElements, page, size))
}

async function getDetail(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { id } = req.query
  const { db } = auth

  const change = await db.collection('Change').findOne({ _id: new ObjectId(id) })
  if (!change) {
    return res.status(404).json({ statusCode: 404, message: 'Change not found' })
  }

  const incidentIds = (change.linkedIncidentIds || []).map((x) => new ObjectId(x))
  const problemIds = (change.linkedProblemIds || []).map((x) => new ObjectId(x))

  const [linkedIncidents, linkedProblems] = await Promise.all([
    incidentIds.length
      ? db.collection('Incident').find({ _id: { $in: incidentIds } }).toArray()
      : Promise.resolve([]),
    problemIds.length
      ? db.collection('Problem').find({ _id: { $in: problemIds } }).toArray()
      : Promise.resolve([]),
  ])

  return res.status(200).json({
    ...serializeChange(change),
    linkedIncidents: linkedIncidents.map(serializeIncident),
    linkedProblems: linkedProblems.map(serializeProblem),
  })
}

async function search(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { db } = auth
  const q = (req.query.q || '').trim()
  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10

  if (!q) {
    return res.status(200).json(toPageResponse([], 0, page, size))
  }

  const pattern = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  const filter = { $or: [{ changeId: pattern }, { title: pattern }, { description: pattern }] }

  const totalElements = await db.collection('Change').countDocuments(filter)
  const items = await db
    .collection('Change')
    .find(filter)
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeChange), totalElements, page, size))
}

const STATUSES = [
  'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SCHEDULED',
  'IN_PROGRESS', 'IMPLEMENTED', 'REVIEWED', 'CLOSED', 'CANCELLED',
]

const ALLOWED_TRANSITIONS = {
  DRAFT: ['CANCELLED'],
  PENDING_APPROVAL: ['CANCELLED'],
  APPROVED: ['SCHEDULED', 'CANCELLED'],
  REJECTED: ['CANCELLED'],
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['IMPLEMENTED', 'CANCELLED'],
  IMPLEMENTED: ['REVIEWED'],
  REVIEWED: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],
}

async function setStatus(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { id } = req.query
  const { db, user } = auth
  const { status, reviewNotes, closureNotes } = req.body || {}

  if (!STATUSES.includes(status)) {
    return res.status(200).json({ statusCode: 409, message: 'Invalid status' })
  }

  const existing = await db.collection('Change').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Change not found' })
  }

  if (!ALLOWED_TRANSITIONS[existing.status]?.includes(status)) {
    return res.status(200).json({
      statusCode: 409,
      message: `Cannot move change from ${existing.status} to ${status}`,
    })
  }

  if (status === 'SCHEDULED' && !existing.scheduledStart) {
    return res.status(200).json({ statusCode: 409, message: 'scheduledStart must be set before scheduling' })
  }
  if (status === 'REVIEWED' && !(reviewNotes || existing.reviewNotes)) {
    return res.status(200).json({ statusCode: 409, message: 'Review notes are required before marking reviewed' })
  }
  if (status === 'CLOSED' && !(closureNotes || existing.closureNotes)) {
    return res.status(200).json({ statusCode: 409, message: 'Closure notes are required to close a change' })
  }

  const now = new Date()
  const update = { status, modifyDate: now }
  if (reviewNotes) update.reviewNotes = reviewNotes
  if (status === 'CLOSED') {
    update.closeDate = now
    if (closureNotes) update.closureNotes = closureNotes
  }

  await db.collection('Change').updateOne({ _id: new ObjectId(id) }, { $set: update })

  await logAudit(db, {
    action: 'STATUS_CHANGE',
    entityType: 'Change',
    entityId: id,
    entityLabel: existing.changeId,
    user,
    req,
    changes: [{ field: 'status', oldValue: existing.status, newValue: status }],
  })

  return res.status(200).json({ statusCode: 200, message: `Change marked ${status}` })
}

async function submitForApproval(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { id } = req.query
  const { db } = auth

  const existing = await db.collection('Change').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Change not found' })
  }
  if (!['DRAFT', 'REJECTED'].includes(existing.status)) {
    return res
      .status(200)
      .json({ statusCode: 409, message: `Change must be DRAFT or REJECTED to submit for approval (currently ${existing.status})` })
  }
  if (!existing.implementationPlan || !existing.backoutPlan) {
    return res.status(200).json({
      statusCode: 409,
      message: 'Implementation plan and backout plan are required before CAB submission',
    })
  }

  await db
    .collection('Change')
    .updateOne({ _id: new ObjectId(id) }, { $set: { status: 'PENDING_APPROVAL', modifyDate: new Date() } })

  return res.status(200).json({ statusCode: 200, message: 'Change submitted for CAB approval' })
}

export default {
  'create': create,
  'decide': decide,
  'edit': edit,
  'get-all-page': getAllPage,
  'get-detail': getDetail,
  'search': search,
  'set-status': setStatus,
  'submit-for-approval': submitForApproval,
}
