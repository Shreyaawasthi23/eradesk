import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { logAudit } from '@/lib/auditLog'

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
