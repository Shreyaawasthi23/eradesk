import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeNotification } from '@/lib/serializers'
import { toPageResponse } from '@/lib/pagination'
import { ObjectId } from 'mongodb'

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

  const { db, user } = auth
  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 20
  const { unreadOnly } = req.query

  const filter = { userId: user._id.toString() }
  if (unreadOnly === 'true') filter.read = false

  const totalElements = await db.collection('Notification').countDocuments(filter)
  const items = await db
    .collection('Notification')
    .find(filter)
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeNotification), totalElements, page, size))
}

async function markAllRead(req, res) {
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
  await db
    .collection('Notification')
    .updateMany({ userId: user._id.toString(), read: false }, { $set: { read: true } })

  return res.status(200).json({ statusCode: 200, message: 'All notifications marked as read' })
}

async function markRead(req, res) {
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

async function unreadCount(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { db, user } = auth
  const count = await db
    .collection('Notification')
    .countDocuments({ userId: user._id.toString(), read: false })

  return res.status(200).json({ count })
}

export default {
  'get-all-page': getAllPage,
  'mark-all-read': markAllRead,
  'mark-read': markRead,
  'unread-count': unreadCount,
}
