import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'
import { serializeRelease, serializeChange, serializeProblem, serializeIncident } from '@/lib/serializers'
import { toPageResponse } from '@/lib/pagination'
import { logAudit } from '@/lib/auditLog'

const TYPES = ['MAJOR', 'MINOR', 'PATCH', 'EMERGENCY']

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
    title, description, version, type, plannedDate,
    engineerId, workGroup, linkedChangeIds, linkedProblemIds, linkedIncidentIds,
  } = req.body || {}

  if (!title || !description) {
    return res.status(200).json({ statusCode: 409, message: 'Title and description are required' })
  }
  if (type && !TYPES.includes(type)) {
    return res.status(200).json({ statusCode: 409, message: 'Invalid release type' })
  }

  const changeIds = Array.isArray(linkedChangeIds) ? linkedChangeIds : []
  const problemIds = Array.isArray(linkedProblemIds) ? linkedProblemIds : []
  const incidentIds = Array.isArray(linkedIncidentIds) ? linkedIncidentIds : []

  if (changeIds.length) {
    const found = await db
      .collection('Change')
      .countDocuments({ _id: { $in: changeIds.map((id) => new ObjectId(id)) } })
    if (found !== changeIds.length) {
      return res.status(200).json({ statusCode: 409, message: 'One or more linked changes were not found' })
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
  if (incidentIds.length) {
    const found = await db
      .collection('Incident')
      .countDocuments({ _id: { $in: incidentIds.map((id) => new ObjectId(id)) } })
    if (found !== incidentIds.length) {
      return res.status(200).json({ statusCode: 409, message: 'One or more linked incidents were not found' })
    }
  }

  const seq = await nextSequence(db, 'ReleaseSequence', 'release_sequence')
  const releaseId = `REL-${String(seq).padStart(6, '0')}`
  const now = new Date()

  const newRelease = {
    releaseId,
    title,
    description,
    version: version || '',
    type: type || 'MINOR',
    status: 'PLANNING',
    plannedDate: plannedDate ? new Date(plannedDate) : null,
    deployedDate: null,
    testNotes: '',
    rollbackPlan: '',
    postReleaseReview: '',
    linkedChangeIds: changeIds,
    linkedProblemIds: problemIds,
    linkedIncidentIds: incidentIds,
    engineerId: engineerId || null,
    workGroup: workGroup || null,
    createDate: now,
    modifyDate: now,
    closeDate: null,
    userId: user._id.toString(),
    userEmail: user.email,
  }

  const result = await db.collection('Release').insertOne(newRelease)

  return res
    .status(200)
    .json({ statusCode: 200, message: `Release created ${releaseId}`, id: result.insertedId.toString() })
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
    title, description, version, plannedDate, testNotes, rollbackPlan,
    engineerId, workGroup,
  } = req.body || {}

  const existing = await db.collection('Release').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Release not found' })
  }
  if (['DEPLOYED', 'REVIEWED', 'CLOSED', 'ROLLED_BACK', 'CANCELLED'].includes(existing.status)) {
    return res
      .status(200)
      .json({ statusCode: 409, message: `Release cannot be edited while ${existing.status}` })
  }

  const update = {
    title: title ?? existing.title,
    description: description ?? existing.description,
    version: version ?? existing.version,
    plannedDate: plannedDate ? new Date(plannedDate) : existing.plannedDate,
    testNotes: testNotes ?? existing.testNotes,
    rollbackPlan: rollbackPlan ?? existing.rollbackPlan,
    engineerId: engineerId ?? existing.engineerId,
    workGroup: workGroup ?? existing.workGroup,
    modifyDate: new Date(),
  }

  await db.collection('Release').updateOne({ _id: new ObjectId(id) }, { $set: update })

  return res.status(200).json({ statusCode: 200, message: 'Release updated successfully' })
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

  const totalElements = await db.collection('Release').countDocuments(filter)
  const items = await db
    .collection('Release')
    .find(filter)
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeRelease), totalElements, page, size))
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

  const release = await db.collection('Release').findOne({ _id: new ObjectId(id) })
  if (!release) {
    return res.status(404).json({ statusCode: 404, message: 'Release not found' })
  }

  const changeIds = (release.linkedChangeIds || []).map((x) => new ObjectId(x))
  const problemIds = (release.linkedProblemIds || []).map((x) => new ObjectId(x))
  const incidentIds = (release.linkedIncidentIds || []).map((x) => new ObjectId(x))

  const [linkedChanges, linkedProblems, linkedIncidents] = await Promise.all([
    changeIds.length ? db.collection('Change').find({ _id: { $in: changeIds } }).toArray() : Promise.resolve([]),
    problemIds.length ? db.collection('Problem').find({ _id: { $in: problemIds } }).toArray() : Promise.resolve([]),
    incidentIds.length ? db.collection('Incident').find({ _id: { $in: incidentIds } }).toArray() : Promise.resolve([]),
  ])

  return res.status(200).json({
    ...serializeRelease(release),
    linkedChanges: linkedChanges.map(serializeChange),
    linkedProblems: linkedProblems.map(serializeProblem),
    linkedIncidents: linkedIncidents.map(serializeIncident),
  })
}

const ENTITY_CONFIG = {
  change: { collection: 'Change', field: 'linkedChangeIds', label: 'change' },
  problem: { collection: 'Problem', field: 'linkedProblemIds', label: 'problem' },
  incident: { collection: 'Incident', field: 'linkedIncidentIds', label: 'incident' },
}

async function link(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { id } = req.query
  const { db } = auth
  const { entityType, entityId } = req.body || {}

  const config = ENTITY_CONFIG[entityType]
  if (!config || !entityId) {
    return res.status(200).json({ statusCode: 409, message: 'entityType must be change, problem, or incident, and entityId is required' })
  }

  const release = await db.collection('Release').findOne({ _id: new ObjectId(id) })
  if (!release) {
    return res.status(200).json({ statusCode: 409, message: 'Release not found' })
  }

  const entity = await db.collection(config.collection).findOne({ _id: new ObjectId(entityId) })
  if (!entity) {
    return res.status(200).json({ statusCode: 409, message: `${config.label} not found` })
  }

  if ((release[config.field] || []).includes(entityId)) {
    return res.status(200).json({ statusCode: 409, message: `This ${config.label} is already linked to the release` })
  }

  await db
    .collection('Release')
    .updateOne({ _id: new ObjectId(id) }, { $addToSet: { [config.field]: entityId }, $set: { modifyDate: new Date() } })

  return res.status(200).json({ statusCode: 200, message: `Linked ${config.label}` })
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
  const filter = { $or: [{ releaseId: pattern }, { title: pattern }, { description: pattern }, { version: pattern }] }

  const totalElements = await db.collection('Release').countDocuments(filter)
  const items = await db
    .collection('Release')
    .find(filter)
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeRelease), totalElements, page, size))
}

const STATUSES = [
  'PLANNING', 'TESTING', 'APPROVED', 'DEPLOYED', 'ROLLED_BACK', 'REVIEWED', 'CLOSED', 'CANCELLED',
]

const ALLOWED_TRANSITIONS = {
  PLANNING: ['TESTING', 'CANCELLED'],
  TESTING: ['APPROVED', 'PLANNING', 'CANCELLED'],
  APPROVED: ['DEPLOYED', 'CANCELLED'],
  DEPLOYED: ['ROLLED_BACK', 'REVIEWED'],
  ROLLED_BACK: ['REVIEWED'],
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
  const { db } = auth
  const { status, testNotes, postReleaseReview } = req.body || {}

  if (!STATUSES.includes(status)) {
    return res.status(200).json({ statusCode: 409, message: 'Invalid status' })
  }

  const existing = await db.collection('Release').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Release not found' })
  }

  if (!ALLOWED_TRANSITIONS[existing.status]?.includes(status)) {
    return res.status(200).json({
      statusCode: 409,
      message: `Cannot move release from ${existing.status} to ${status}`,
    })
  }

  if (status === 'APPROVED' && !(testNotes || existing.testNotes)) {
    return res.status(200).json({ statusCode: 409, message: 'Test notes are required before approving a release' })
  }
  if (status === 'DEPLOYED' && !existing.rollbackPlan) {
    return res.status(200).json({ statusCode: 409, message: 'A rollback plan is required before deployment' })
  }
  if (status === 'REVIEWED' && !(postReleaseReview || existing.postReleaseReview)) {
    return res.status(200).json({ statusCode: 409, message: 'A post-release review is required' })
  }

  const now = new Date()
  const update = { status, modifyDate: now }
  if (testNotes) update.testNotes = testNotes
  if (postReleaseReview) update.postReleaseReview = postReleaseReview
  if (status === 'DEPLOYED') update.deployedDate = now
  if (status === 'CLOSED') update.closeDate = now

  await db.collection('Release').updateOne({ _id: new ObjectId(id) }, { $set: update })

  await db.collection('ReleaseChangeLog').insertOne({
    releaseId: existing.releaseId,
    releaseRefId: id,
    note: `${auth.user.email} changed release status from ${existing.status} to ${status}`,
    userId: auth.user._id.toString(),
    userEmail: auth.user.email,
    createDate: now,
  })

  await logAudit(db, {
    action: 'STATUS_CHANGE',
    entityType: 'Release',
    entityId: id,
    entityLabel: existing.releaseId,
    user: auth.user,
    req,
    changes: [{ field: 'status', oldValue: existing.status, newValue: status }],
  })

  return res.status(200).json({ statusCode: 200, message: `Release marked ${status}` })
}

export default {
  'create': create,
  'edit': edit,
  'get-all-page': getAllPage,
  'get-detail': getDetail,
  'link': link,
  'search': search,
  'set-status': setStatus,
}
