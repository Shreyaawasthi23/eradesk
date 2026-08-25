import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'

const EXCEL_EPOCH_DIFF = 25569
const MILLIS_PER_DAY = 24 * 60 * 60 * 1000

function excelDate(dateNo) {
  return new Date((Number(dateNo) - EXCEL_EPOCH_DIFF) * MILLIS_PER_DAY)
}

// Excel cells with numeric-looking content (pin codes, PO numbers, etc.)
// come through as JS numbers rather than strings, so .trim() isn't safe
// to call directly on row values.
function trimmed(value) {
  return String(value ?? '').trim()
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
    const serialNo = trimmed(row.SerialNo)
    const checkAsset = await db.collection('Assets').findOne({ serialNumber: { $regex: serialNo, $options: 'i' } })
    if (checkAsset) {
      duplicate++
      continue
    }

    const endClient = await db.collection('EndClient').findOne({ _id: new ObjectId(trimmed(row.EndClientId)) })
    const purchaseOrder = await db.collection('PurchaseOrder').findOne({ purchaseOrderNumber: trimmed(row.PONumber) })

    const seq = await nextSequence(db, 'AssetSequence', 'asset_sequence')
    const assetId = `AST00${seq}`
    const now = new Date()

    await db.collection('Assets').insertOne({
      make: trimmed(row.Make),
      model: trimmed(row.Model),
      serialNumber: serialNo,
      purchaseOrderNumber: trimmed(row.PONumber),
      startDate: excelDate(row.StartDate),
      endDate: excelDate(row.EndDate),
      sla: trimmed(row.SLA),
      assetType: trimmed(row.AssetType),
      pinCode: trimmed(row.PinCode),
      city: trimmed(row.City),
      state: trimmed(row.State),
      address: trimmed(row.Address),
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
