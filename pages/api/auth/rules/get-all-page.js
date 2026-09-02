import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeBusinessRule } from '@/lib/serializers'
import { toPageResponse } from '@/lib/pagination'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { entityType } = req.query
  const { db } = auth

  const filter = {}
  if (entityType) filter.entityType = entityType

  const totalElements = await db.collection('BusinessRule').countDocuments(filter)
  const items = await db
    .collection('BusinessRule')
    .find(filter)
    .sort({ entityType: 1, priority: 1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeBusinessRule), totalElements, page, size))
}
