import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { logAudit } from '@/lib/auditLog'

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
