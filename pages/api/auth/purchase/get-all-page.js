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

  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { db } = auth

  const search = (req.query.search || '').trim()
  const status = req.query.status
  const endClientId = req.query.endClientId
  const startDate = req.query.startDate
  const endDate = req.query.endDate

  const filter = {}
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ purchaseOrderNumber: regex }, { contactName: regex }, { contactEmail: regex }]
  }
  if (status === 'true' || status === 'false') {
    filter.status = status === 'true'
  }
  if (endClientId) {
    filter.endClientId = endClientId
  }
  if (startDate || endDate) {
    filter.startDate = {}
    if (startDate) filter.startDate.$gte = new Date(startDate)
    if (endDate) filter.startDate.$lte = new Date(endDate + 'T23:59:59.999Z')
  }

  const totalElements = await db.collection('PurchaseOrder').countDocuments(filter)
  const items = await db
    .collection('PurchaseOrder')
    .find(filter)
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializePurchase), totalElements, page, size))
}
