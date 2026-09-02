import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'
import { ObjectId } from 'mongodb'
import { serializeAnnouncement } from '@/lib/serializers'
import { toPageResponse } from '@/lib/pagination'

const AUDIENCES = ['ALL', 'TECHNICIAN', 'END_USER']

async function create(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { db, user } = auth
  const { title, description, priority, startDate, endDate, audience, source, sourceId } = req.body || {}

  if (!title || !startDate || !endDate) {
    return res.status(200).json({ statusCode: 409, message: 'title, startDate, and endDate are required' })
  }
  if (new Date(endDate) <= new Date(startDate)) {
    return res.status(200).json({ statusCode: 409, message: 'endDate must be after startDate' })
  }
  const resolvedAudience = audience || 'ALL'
  if (!AUDIENCES.includes(resolvedAudience)) {
    return res.status(200).json({ statusCode: 409, message: 'Invalid audience' })
  }

  const seq = await nextSequence(db, 'AnnouncementSequence', 'announcement_sequence')
  const announcementId = `ANN-${String(seq).padStart(6, '0')}`
  const now = new Date()

  const newAnnouncement = {
    announcementId,
    title,
    description: description || '',
    priority: priority || 'NORMAL',
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    audience: resolvedAudience,
    source: source || 'MANUAL',
    sourceId: sourceId || null,
    createDate: now,
    modifyDate: now,
    userId: user._id.toString(),
    userEmail: user.email,
  }

  const result = await db.collection('Announcement').insertOne(newAnnouncement)

  return res
    .status(200)
    .json({ statusCode: 200, message: `Announcement created ${announcementId}`, id: result.insertedId.toString() })
}

async function edit(req, res) {
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
  const { title, description, priority, endDate } = req.body || {}

  const existing = await db.collection('Announcement').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Announcement not found' })
  }

  const nextEndDate = endDate ? new Date(endDate) : existing.endDate
  if (nextEndDate <= existing.startDate) {
    return res.status(200).json({ statusCode: 409, message: 'endDate must be after startDate' })
  }

  const update = {
    title: title ?? existing.title,
    description: description ?? existing.description,
    priority: priority ?? existing.priority,
    endDate: nextEndDate,
    modifyDate: new Date(),
  }

  await db.collection('Announcement').updateOne({ _id: new ObjectId(id) }, { $set: update })

  return res.status(200).json({ statusCode: 200, message: 'Announcement updated successfully' })
}

// Currently-live announcements (now falls within startDate..endDate), for dashboard/portal
// display — matches spec section 38's "display in self-service portal / technician portal /
// dashboard".
async function getActive(req, res) {
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
  const now = new Date()

  const announcements = await db
    .collection('Announcement')
    .find({ startDate: { $lte: now }, endDate: { $gte: now } })
    .sort({ priority: -1, startDate: -1 })
    .toArray()

  return res.status(200).json(announcements.map(serializeAnnouncement))
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
  const { db } = auth

  const totalElements = await db.collection('Announcement').countDocuments({})
  const items = await db
    .collection('Announcement')
    .find({})
    .sort({ startDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeAnnouncement), totalElements, page, size))
}

export default {
  'create': create,
  'edit': edit,
  'get-active': getActive,
  'get-all-page': getAllPage,
}
