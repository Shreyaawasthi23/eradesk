import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializePurchase } from '@/lib/serializers'
import { toPageResponse } from '@/lib/pagination'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { poNumber } = req.query
  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { db } = auth

  // Java's equivalent counts against the wrong collection (copy-paste bug) — fixed here to
  // count PurchaseOrder itself so pagination totals are correct.
  const filter = { purchaseOrderNumber: { $regex: poNumber, $options: 'i' } }
  const totalElements = await db.collection('PurchaseOrder').countDocuments(filter)
  const items = await db
    .collection('PurchaseOrder')
    .find(filter)
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializePurchase), totalElements, page, size))
}
