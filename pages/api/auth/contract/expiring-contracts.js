import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeContract } from '@/lib/serializers'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { db } = auth
  const days = Number(req.query.days) || 30
  const now = new Date()
  const threshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  const contracts = await db
    .collection('Contract')
    .find({ status: 'ACTIVE', endDate: { $lte: threshold } })
    .sort({ endDate: 1 })
    .toArray()

  return res.status(200).json(contracts.map(serializeContract))
}
