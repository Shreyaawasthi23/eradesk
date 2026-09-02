import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'

const AUDIENCES = ['ALL', 'TECHNICIAN', 'END_USER']

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
