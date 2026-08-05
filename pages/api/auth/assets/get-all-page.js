import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeAsset } from '@/lib/serializers'
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

  const search = (req.query.search || '').trim()
  const poNumber = (req.query.poNumber || '').trim()
  const serialNo = (req.query.serialNo || '').trim()

  const filter = {}
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ make: regex }, { model: regex }]
  }
  if (poNumber) {
    filter.purchaseOrderNumber = new RegExp(poNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  }
  if (serialNo) {
    filter.serialNumber = new RegExp(serialNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  }

  const totalElements = await db.collection('Assets').countDocuments(filter)
  const items = await db
    .collection('Assets')
    .find(filter)
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeAsset), totalElements, page, size))
}
