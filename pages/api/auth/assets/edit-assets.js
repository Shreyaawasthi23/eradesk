import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const { remarks, id } = req.query
  const { db } = auth
  const {
    make, model, serialNumber, purchaseOrderNumber, startDate, endDate,
    sla, assetType, pinCode, city, state, address, endClientId, userId,
  } = req.body || {}

  const user = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  if (!user) {
    return res.status(200).json({ statusCode: 409, message: 'User Not Found' })
  }

  const existingAsset = await db.collection('Assets').findOne({ _id: new ObjectId(id) })

  const update = {
    make,
    model,
    purchaseOrderNumber,
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    sla,
    assetType,
    pinCode,
    city,
    state,
    address,
    modifyDate: new Date(),
  }

  if (serialNumber !== existingAsset.serialNumber) {
    const check = await db.collection('Assets').findOne({ serialNumber })
    if (check) {
      return res.status(200).json({ statusCode: 409, message: 'Asset already exist with same serial number' })
    }
    update.serialNumber = serialNumber
  }

  const endClient = await db.collection('EndClient').findOne({ _id: new ObjectId(endClientId) })
  update.endClientId = endClient._id.toString()
  update.frontClientId = endClient.frontClientId

  const purchaseOrder = await db.collection('PurchaseOrder').findOne({ purchaseOrderNumber })
  update.purchaseId = purchaseOrder ? purchaseOrder._id.toString() : null

  await db.collection('Assets').updateOne({ _id: new ObjectId(id) }, { $set: update })

  await db.collection('AssetsChangeLog').insertOne({
    createDate: new Date(),
    remarks,
    userName: `${user.firstName} ${user.lastName}`,
    userId,
    assetId: existingAsset.assetId,
  })

  return res.status(200).json({ statusCode: 200, message: `${existingAsset.assetId} edited successfully!` })
}
