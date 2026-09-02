import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED']

const ALLOWED_TRANSITIONS = {
  PENDING_APPROVAL: ['CANCELLED'],
  OPEN: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['RESOLVED', 'CANCELLED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
  REJECTED: [],
  CANCELLED: [],
}

export default async function handler(req, res) {
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
  const { status, closureNotes } = req.body || {}

  if (!STATUSES.includes(status) && status !== 'CANCELLED') {
    return res.status(200).json({ statusCode: 409, message: 'Invalid status' })
  }

  const existing = await db.collection('ServiceRequest').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Service request not found' })
  }

  if (!ALLOWED_TRANSITIONS[existing.status]?.includes(status)) {
    return res.status(200).json({
      statusCode: 409,
      message: `Cannot move service request from ${existing.status} to ${status}`,
    })
  }
  if (status === 'CLOSED' && !(closureNotes || existing.closureNotes)) {
    return res.status(200).json({ statusCode: 409, message: 'Closure notes are required to close a service request' })
  }

  const now = new Date()
  const update = { status, modifyDate: now }
  if (closureNotes) update.closureNotes = closureNotes
  if (status === 'CLOSED') update.closeDate = now

  await db.collection('ServiceRequest').updateOne({ _id: new ObjectId(id) }, { $set: update })

  return res.status(200).json({ statusCode: 200, message: `Service request marked ${status}` })
}
