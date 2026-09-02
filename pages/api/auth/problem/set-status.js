import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { logAudit } from '@/lib/auditLog'

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

export default async function handler(req, res) {
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
