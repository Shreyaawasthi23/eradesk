import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeChallan } from '@/lib/serializers'
import { toPageResponse } from '@/lib/pagination'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER'])) return res.status(403).end()

  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { db } = auth

  const totalElements = await db.collection('DeliveryChallan').countDocuments({})
  const items = await db
    .collection('DeliveryChallan')
    .find({})
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeChallan), totalElements, page, size))
}
