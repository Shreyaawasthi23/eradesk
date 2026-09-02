import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'
import { runBusinessRules } from '@/lib/runBusinessRules'
import { serializeProblem, serializeIncident, serializeChange } from '@/lib/serializers'
import { toPageResponse } from '@/lib/pagination'
import { logAudit } from '@/lib/auditLog'

async function createFromIncident(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { db, user } = auth
  const { incidentId, title, description, symptoms } = req.body || {}

  if (!incidentId) {
    return res.status(200).json({ statusCode: 409, message: 'incidentId is required' })
  }

  const incident = await db.collection('Incident').findOne({ _id: new ObjectId(incidentId) })
  if (!incident) {
    return res.status(200).json({ statusCode: 409, message: 'Incident not found' })
  }

  const seq = await nextSequence(db, 'ProblemSequence', 'problem_sequence')
  const problemId = `PRB-${String(seq).padStart(6, '0')}`
  const now = new Date()

  const newProblem = {
    problemId,
    title: title || `Problem from ${incident.incidentId}: ${incident.problem || ''}`.slice(0, 150),
    description: description || incident.problem || '',
    priority: incident.priority || 3,
    status: 'OPEN',
    symptoms: symptoms || incident.problem || '',
    rootCause: '',
    workaround: '',
    knownError: false,
    permanentSolution: '',
    closureNotes: '',
    linkedIncidentIds: [incidentId],
    linkedChangeIds: [],
    engineerId: incident.engineerId || null,
    workGroup: null,
    createDate: now,
    modifyDate: now,
    closeDate: null,
    userId: user._id.toString(),
    userEmail: user.email,
  }

  const result = await db.collection('Problem').insertOne(newProblem)

  return res.status(200).json({
    statusCode: 200,
    message: `Problem created ${problemId} from incident ${incident.incidentId}`,
    id: result.insertedId.toString(),
  })
}

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
  const { title, description, priority, symptoms, engineerId, workGroup, linkedIncidentIds } =
    req.body || {}

  if (!title || !description) {
    return res.status(200).json({ statusCode: 409, message: 'Title and description are required' })
  }

  const incidentIds = Array.isArray(linkedIncidentIds) ? linkedIncidentIds : []
  if (incidentIds.length) {
    const found = await db
      .collection('Incident')
      .find({ _id: { $in: incidentIds.map((id) => new ObjectId(id)) } })
      .toArray()
    if (found.length !== incidentIds.length) {
      return res.status(200).json({ statusCode: 409, message: 'One or more linked incidents were not found' })
    }
  }

  const seq = await nextSequence(db, 'ProblemSequence', 'problem_sequence')
  const problemId = `PRB-${String(seq).padStart(6, '0')}`
  const now = new Date()

  const newProblem = {
    problemId,
    title,
    description,
    priority: priority || 3,
    status: 'OPEN',
    symptoms: symptoms || '',
    rootCause: '',
    workaround: '',
    knownError: false,
    permanentSolution: '',
    closureNotes: '',
    linkedIncidentIds: incidentIds,
    linkedChangeIds: [],
    engineerId: engineerId || null,
    workGroup: workGroup || null,
    createDate: now,
    modifyDate: now,
    closeDate: null,
    userId: user._id.toString(),
    userEmail: user.email,
  }

  const result = await db.collection('Problem').insertOne(newProblem)

  await runBusinessRules(db, {
    collectionName: 'Problem',
    entityType: 'Problem',
    trigger: 'ON_CREATE',
    entityId: result.insertedId.toString(),
    entity: newProblem,
  })

  return res
    .status(200)
    .json({ statusCode: 200, message: `Problem created ${problemId}`, id: result.insertedId.toString() })
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
  const { title, description, priority, symptoms, rootCause, workaround, permanentSolution, engineerId, workGroup } =
    req.body || {}

  const existing = await db.collection('Problem').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Problem not found' })
  }

  const update = {
    title: title ?? existing.title,
    description: description ?? existing.description,
    priority: priority ?? existing.priority,
    symptoms: symptoms ?? existing.symptoms,
    rootCause: rootCause ?? existing.rootCause,
    workaround: workaround ?? existing.workaround,
    permanentSolution: permanentSolution ?? existing.permanentSolution,
    engineerId: engineerId ?? existing.engineerId,
    workGroup: workGroup ?? existing.workGroup,
    modifyDate: new Date(),
  }

  await db.collection('Problem').updateOne({ _id: new ObjectId(id) }, { $set: update })

  return res.status(200).json({ statusCode: 200, message: 'Problem updated successfully' })
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
  const { status, priority } = req.query
  const { db } = auth

  const filter = {}
  if (status) filter.status = status
  if (priority) filter.priority = Number(priority)

  const totalElements = await db.collection('Problem').countDocuments(filter)
  const items = await db
    .collection('Problem')
    .find(filter)
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeProblem), totalElements, page, size))
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

  const problem = await db.collection('Problem').findOne({ _id: new ObjectId(id) })
  if (!problem) {
    return res.status(404).json({ statusCode: 404, message: 'Problem not found' })
  }

  const incidentIds = (problem.linkedIncidentIds || []).map((x) => new ObjectId(x))
  const changeIds = (problem.linkedChangeIds || []).map((x) => new ObjectId(x))

  const [linkedIncidents, linkedChanges] = await Promise.all([
    incidentIds.length
      ? db.collection('Incident').find({ _id: { $in: incidentIds } }).toArray()
      : Promise.resolve([]),
    changeIds.length
      ? db.collection('Change').find({ _id: { $in: changeIds } }).toArray()
      : Promise.resolve([]),
  ])

  return res.status(200).json({
    ...serializeProblem(problem),
    linkedIncidents: linkedIncidents.map(serializeIncident),
    linkedChanges: linkedChanges.map(serializeChange),
  })
}

async function linkIncident(req, res) {
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
  const { incidentId } = req.body || {}

  if (!incidentId) {
    return res.status(200).json({ statusCode: 409, message: 'incidentId is required' })
  }

  const problem = await db.collection('Problem').findOne({ _id: new ObjectId(id) })
  if (!problem) {
    return res.status(200).json({ statusCode: 409, message: 'Problem not found' })
  }

  const incident = await db.collection('Incident').findOne({ _id: new ObjectId(incidentId) })
  if (!incident) {
    return res.status(200).json({ statusCode: 409, message: 'Incident not found' })
  }

  if ((problem.linkedIncidentIds || []).includes(incidentId)) {
    return res.status(200).json({ statusCode: 409, message: 'Incident is already linked to this problem' })
  }

  await db
    .collection('Problem')
    .updateOne({ _id: new ObjectId(id) }, { $addToSet: { linkedIncidentIds: incidentId }, $set: { modifyDate: new Date() } })

  return res.status(200).json({ statusCode: 200, message: `Linked incident ${incident.incidentId}` })
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
  const filter = { $or: [{ problemId: pattern }, { title: pattern }, { description: pattern }] }

  const totalElements = await db.collection('Problem').countDocuments(filter)
  const items = await db
    .collection('Problem')
    .find(filter)
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeProblem), totalElements, page, size))
}

const STATUSES = ['OPEN', 'INVESTIGATING', 'KNOWN_ERROR', 'RESOLVED', 'CLOSED', 'CANCELLED']

// Problem lifecycle mirrors ITIL problem management: investigation -> known error (once a
// workaround exists) -> resolved (once a permanent solution exists) -> closed. Cancellation is
// allowed from any non-terminal state.
const ALLOWED_TRANSITIONS = {
  OPEN: ['INVESTIGATING', 'CANCELLED'],
  INVESTIGATING: ['KNOWN_ERROR', 'RESOLVED', 'CANCELLED'],
  KNOWN_ERROR: ['RESOLVED', 'CANCELLED'],
  RESOLVED: ['CLOSED', 'INVESTIGATING'],
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
  const { status, closureNotes } = req.body || {}

  if (!STATUSES.includes(status)) {
    return res.status(200).json({ statusCode: 409, message: 'Invalid status' })
  }

  const existing = await db.collection('Problem').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Problem not found' })
  }

  if (!ALLOWED_TRANSITIONS[existing.status]?.includes(status)) {
    return res.status(200).json({
      statusCode: 409,
      message: `Cannot move problem from ${existing.status} to ${status}`,
    })
  }

  if (status === 'KNOWN_ERROR' && !existing.workaround) {
    return res.status(200).json({ statusCode: 409, message: 'A workaround is required before marking as a known error' })
  }
  if (status === 'RESOLVED' && !existing.rootCause) {
    return res.status(200).json({ statusCode: 409, message: 'Root cause analysis is required before resolving' })
  }
  if (status === 'CLOSED' && !(closureNotes || existing.closureNotes)) {
    return res.status(200).json({ statusCode: 409, message: 'Closure notes are required to close a problem' })
  }

  const now = new Date()
  const update = { status, modifyDate: now }
  if (status === 'KNOWN_ERROR') update.knownError = true
  if (status === 'CLOSED') {
    update.closeDate = now
    if (closureNotes) update.closureNotes = closureNotes
  }

  await db.collection('Problem').updateOne({ _id: new ObjectId(id) }, { $set: update })

  await db.collection('ProblemChangeLog').insertOne({
    problemId: existing.problemId,
    problemRefId: id,
    note: `${user.email} changed problem status from ${existing.status} to ${status}`,
    userId: user._id.toString(),
    userEmail: user.email,
    createDate: now,
  })

  await logAudit(db, {
    action: 'STATUS_CHANGE',
    entityType: 'Problem',
    entityId: id,
    entityLabel: existing.problemId,
    user,
    req,
    changes: [{ field: 'status', oldValue: existing.status, newValue: status }],
  })

  return res.status(200).json({ statusCode: 200, message: `Problem marked ${status}` })
}

export default {
  'create-from-incident': createFromIncident,
  'create': create,
  'edit': edit,
  'get-all-page': getAllPage,
  'get-detail': getDetail,
  'link-incident': linkIncident,
  'search': search,
  'set-status': setStatus,
}
