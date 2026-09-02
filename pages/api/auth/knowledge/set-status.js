import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

const ALLOWED_STATUSES = ['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']

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
  const { status } = req.body || {}

  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(200).json({ statusCode: 409, message: 'Invalid status' })
  }

  const existing = await db.collection('KnowledgeArticle').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Knowledge article not found' })
  }

  const update = { status, modifyDate: new Date() }
  if (status === 'PUBLISHED' && !existing.publishedDate) {
    update.publishedDate = new Date()
  }

  await db.collection('KnowledgeArticle').updateOne({ _id: new ObjectId(id) }, { $set: update })

  return res.status(200).json({ statusCode: 200, message: `Article marked ${status}` })
}
