import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

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
  const { title, description, category, tags, visibility } = req.body || {}

  const existing = await db.collection('KnowledgeArticle').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Knowledge article not found' })
  }

  const update = {
    title,
    description,
    category: category || existing.category,
    tags: Array.isArray(tags) ? tags : existing.tags,
    visibility: visibility === 'PUBLIC' ? 'PUBLIC' : 'INTERNAL',
    version: (existing.version || 1) + 1,
    modifyDate: new Date(),
  }

  await db.collection('KnowledgeArticle').updateOne({ _id: new ObjectId(id) }, { $set: update })

  return res.status(200).json({ statusCode: 200, message: 'Knowledge article updated successfully' })
}
