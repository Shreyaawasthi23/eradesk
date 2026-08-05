import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { locationId: id, remarks } = req.query
  if (!id && !remarks) {
    return res.status(200).json({ statusCode: 409, message: 'Remarks or Location ID is empty' })
  }

  const { db } = auth
  const {
    endClientId, purchaseOrderNumber, contactName, contactNumber, contactEmail,
    startDate, endDate, poReceiveDate, type, userId, status, value, salesId,
  } = req.body || {}

  const user = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  const purchaseOrder = await db.collection('PurchaseOrder').findOne({ _id: new ObjectId(id) })

  const endClient = await db.collection('EndClient').findOne({ _id: new ObjectId(endClientId) })

  const update = {
    endClientId,
    frontClientId: endClient.frontClientId,
    contactName: (contactName || '').trim(),
    contactNumber: (contactNumber || '').trim(),
    contactEmail: (contactEmail || '').trim(),
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    poReceiveDate,
    type,
    modifyDate: new Date(),
    status: !!status,
    value,
    salesId,
  }

  let assetUpdateCount = 0
  const trimmedPo = (purchaseOrderNumber || '').trim()
  if (trimmedPo !== purchaseOrder.purchaseOrderNumber) {
    const check = await db.collection('PurchaseOrder').findOne({ purchaseOrderNumber: trimmedPo })
    if (check) {
      return res.status(200).json({ statusCode: 409, message: 'Purchase already exist with same PO Number' })
    }
    const assets = await db.collection('Assets').find({ purchaseOrderNumber: purchaseOrder.purchaseOrderNumber }).toArray()
    for (const asset of assets) {
      await db.collection('Assets').updateOne(
        { _id: asset._id },
        { $set: { modifyDate: new Date(), purchaseOrderNumber: trimmedPo } },
      )
      assetUpdateCount++
    }
    update.purchaseOrderNumber = trimmedPo
  }

  await db.collection('PurchaseOrder').updateOne({ _id: new ObjectId(id) }, { $set: update })

  const finalRemarks = assetUpdateCount === 0
    ? remarks
    : `${remarks}-Purchase Order Number Edited Changes in ${assetUpdateCount} Asset(s)`

  await db.collection('PurchaseChangeLog').insertOne({
    createDate: new Date(),
    remarks: finalRemarks,
    userName: `${user.firstName} ${user.lastName}`,
    userId: user._id.toString(),
    purchaseId: id,
  })

  return res.status(200).json({ statusCode: 200, message: finalRemarks })
}
