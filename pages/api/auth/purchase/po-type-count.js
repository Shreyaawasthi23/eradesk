import { authenticate, hasAnyRole } from '@/lib/apiAuth'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { db } = auth
  const results = await db
    .collection('PurchaseOrder')
    .aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }])
    .toArray()

  const response = results.map((r) => ({ assetType: r._id, count: r.count }))
  return res.status(200).json(response)
}
