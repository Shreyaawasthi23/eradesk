import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeKnowledgeArticle } from '@/lib/serializers'
import { toPageResponse } from '@/lib/pagination'

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

  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { status, category } = req.query
  const { db } = auth

  const filter = {}
  if (status) filter.status = status
  if (category) filter.category = category

  const totalElements = await db.collection('KnowledgeArticle').countDocuments(filter)
  const items = await db
    .collection('KnowledgeArticle')
    .find(filter)
    .sort({ modifyDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res
    .status(200)
    .json(toPageResponse(items.map(serializeKnowledgeArticle), totalElements, page, size))
}
