import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'

const EXCEL_EPOCH_DIFF = 25569
const MILLIS_PER_DAY = 24 * 60 * 60 * 1000

function excelDate(dateNo) {
  return new Date((Number(dateNo) - EXCEL_EPOCH_DIFF) * MILLIS_PER_DAY)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { userId } = req.query
  const { db } = auth
  const rows = req.body || []

  const user = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  if (!user) {
    return res.status(200).json({ statusCode: 409, message: 'User Not Found' })
  }

  const assetIds = []
  let assetCount = 0
  let duplicate = 0

  for (const row of rows) {
    const serialNo = (row.SerialNo || '').trim()
    const checkAsset = await db.collection('Assets').findOne({ serialNumber: { $regex: serialNo, $options: 'i' } })
    if (checkAsset) {
      duplicate++
      continue
    }

    const endClient = await db.collection('EndClient').findOne({ _id: new ObjectId((row.EndClientId || '').trim()) })
    const purchaseOrder = await db.collection('PurchaseOrder').findOne({ purchaseOrderNumber: (row.PONumber || '').trim() })

    const seq = await nextSequence(db, 'AssetSequence', 'asset_sequence')
    const assetId = `AST00${seq}`
    const now = new Date()

    await db.collection('Assets').insertOne({
      make: (row.Make || '').trim(),
      model: (row.Model || '').trim(),
      serialNumber: serialNo,
      purchaseOrderNumber: (row.PONumber || '').trim(),
      startDate: excelDate(row.StartDate),
      endDate: excelDate(row.EndDate),
      sla: (row.SLA || '').trim(),
      assetType: (row.AssetType || '').trim(),
      pinCode: (row.PinCode || '').trim(),
      city: (row.City || '').trim(),
      state: (row.State || '').trim(),
      address: (row.Address || '').trim(),
      endClientId: endClient ? endClient._id.toString() : null,
      frontClientId: endClient ? endClient.frontClientId : null,
      purchaseId: purchaseOrder ? purchaseOrder._id.toString() : null,
      assetId,
      userName: user.email,
      userId: user._id.toString(),
      createDate: now,
      modifyDate: now,
    })

    assetCount++
    assetIds.push(assetId)
  }

  const remarks = `Uploaded ${assetCount} Assets with ${duplicate} duplicates`
  await db.collection('AssetUploadChangeLogs').insertOne({
    assetId: assetIds,
    createDate: new Date(),
    count: assetCount,
    userId: user._id.toString(),
    userEmail: user.email,
    remarks,
  })

  return res.status(200).json({ statusCode: 200, message: remarks })
}
