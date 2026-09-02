import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

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
