import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const { db } = auth
  const {
    make, model, serialNumber, purchaseOrderNumber, startDate, endDate,
    sla, assetType, pinCode, city, state, address, endClientId, userId,
  } = req.body || {}

  const existing = await db.collection('Assets').findOne({
    serialNumber: { $regex: serialNumber, $options: 'i' },
  })
  if (existing) {
    return res.status(200).json({ statusCode: 409, message: `${existing.assetId} Asset already exist!` })
  }

  const user = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  if (!user) {
    return res.status(200).json({ statusCode: 404, message: 'Asset Added Successfully' })
  }

  const endClient = await db.collection('EndClient').findOne({ _id: new ObjectId(endClientId) })
  const purchaseOrder = await db.collection('PurchaseOrder').findOne({ purchaseOrderNumber })

  const seq = await nextSequence(db, 'AssetSequence', 'asset_sequence')
  const assetId = `AST00${seq}`
  const now = new Date()

  await db.collection('Assets').insertOne({
    make,
    model,
    serialNumber,
    purchaseOrderNumber,
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    sla,
    assetType,
    pinCode,
    city,
    state,
    address,
    endClientId: endClient._id.toString(),
    frontClientId: endClient.frontClientId,
    purchaseId: purchaseOrder ? purchaseOrder._id.toString() : null,
    assetId,
    userId: user._id.toString(),
    userName: `${user.firstName} ${user.lastName}`,
    createDate: now,
    modifyDate: now,
  })

  return res.status(200).json({ statusCode: 200, message: `Asset Added ${assetId}` })
}
