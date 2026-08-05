import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeIncident } from '@/lib/serializers'
import { toPageResponse } from '@/lib/pagination'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { startDate, endDate } = req.query
  const pageNo = Number(req.query.pageNo) || 0
  const size = Number(req.query.size) || 10
  const { db } = auth

  const filter = { createDate: { $gte: new Date(startDate), $lte: new Date(endDate) } }
  const totalElements = await db.collection('Incident').countDocuments(filter)
  const items = await db
    .collection('Incident')
    .find(filter)
    .skip(pageNo * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeIncident), totalElements, pageNo, size))
}
