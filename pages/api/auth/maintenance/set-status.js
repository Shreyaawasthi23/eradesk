import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

const STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

const ALLOWED_TRANSITIONS = {
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
}

export default async function handler(req, res) {
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
  const { db } = auth
  const { status } = req.body || {}

  if (!STATUSES.includes(status)) {
    return res.status(200).json({ statusCode: 409, message: 'Invalid status' })
  }

  const existing = await db.collection('MaintenanceWindow').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Maintenance window not found' })
  }

  if (!ALLOWED_TRANSITIONS[existing.status]?.includes(status)) {
    return res.status(200).json({
      statusCode: 409,
      message: `Cannot move maintenance window from ${existing.status} to ${status}`,
    })
  }

  const now = new Date()
  await db
    .collection('MaintenanceWindow')
    .updateOne({ _id: new ObjectId(id) }, { $set: { status, modifyDate: now } })

  // Cancelling the maintenance window also ends its announcement immediately, so users stop
  // seeing a notice for maintenance that isn't happening.
  if (status === 'CANCELLED' && existing.announcementId) {
    await db
      .collection('Announcement')
      .updateOne({ _id: new ObjectId(existing.announcementId) }, { $set: { endDate: now, modifyDate: now } })
  }

  return res.status(200).json({ statusCode: 200, message: `Maintenance window marked ${status}` })
}
