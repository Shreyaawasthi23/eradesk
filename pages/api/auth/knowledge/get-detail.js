import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeKnowledgeArticle } from '@/lib/serializers'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { id } = req.query
  const { db } = auth

  const article = await db.collection('KnowledgeArticle').findOne({ _id: new ObjectId(id) })
  if (!article) {
    return res.status(404).json({ statusCode: 404, message: 'Knowledge article not found' })
  }

  await db.collection('KnowledgeArticle').updateOne({ _id: new ObjectId(id) }, { $inc: { viewCount: 1 } })
  article.viewCount = (article.viewCount || 0) + 1

  return res.status(200).json(serializeKnowledgeArticle(article))
}
