import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

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
  const { db, user } = auth

  // Scoped to the caller's own userId so one user can never mark (or even confirm the
  // existence of) another user's notification by guessing an id.
  const result = await db
    .collection('Notification')
    .updateOne({ _id: new ObjectId(id), userId: user._id.toString() }, { $set: { read: true } })

  if (!result.matchedCount) {
    return res.status(200).json({ statusCode: 409, message: 'Notification not found' })
  }

  return res.status(200).json({ statusCode: 200, message: 'Marked as read' })
}
