import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeDeliveryTracking } from '@/lib/serializers'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER'])) return res.status(403).end()

  const { id } = req.query
  const items = await auth.db.collection('DeliveryTracking').find({ challanId: id }).toArray()

  return res.status(200).json(items.map(serializeDeliveryTracking))
}
