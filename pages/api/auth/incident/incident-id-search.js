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
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { incidentId } = req.query
  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { db, user } = auth

  const filter = { incidentId: { $regex: incidentId, $options: 'i' } }
  if (auth.roles.length === 1 && auth.roles.includes('ROLE_ENGINEER')) {
    filter.engineerId = user._id.toString()
  }
  const totalElements = await db.collection('Incident').countDocuments(filter)
  const items = await db.collection('Incident').find(filter).skip(page * size).limit(size).toArray()

  return res.status(200).json(toPageResponse(items.map(serializeIncident), totalElements, page, size))
}
