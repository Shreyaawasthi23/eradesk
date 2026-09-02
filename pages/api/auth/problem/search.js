import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeProblem } from '@/lib/serializers'
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

  const { db } = auth
  const q = (req.query.q || '').trim()
  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10

  if (!q) {
    return res.status(200).json(toPageResponse([], 0, page, size))
  }

  const pattern = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  const filter = { $or: [{ problemId: pattern }, { title: pattern }, { description: pattern }] }

  const totalElements = await db.collection('Problem').countDocuments(filter)
  const items = await db
    .collection('Problem')
    .find(filter)
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeProblem), totalElements, page, size))
}
