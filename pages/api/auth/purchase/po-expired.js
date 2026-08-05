import { authenticate, hasAnyRole } from '@/lib/apiAuth'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { poNumber } = req.query
  const { db } = auth

  const existingPo = await db.collection('PurchaseOrder').findOne({ purchaseOrderNumber: poNumber })
  if (!existingPo) {
    return res.status(200).json({ statusCode: 409, message: 'Purchase Order already exist!' })
  }

  // NOTE: Java's poExpiry also writes an Assets-backup .xlsx file to a hardcoded server path
  // (/home/eradesk/Documents/AssetBackup/) — that filesystem side effect has no Next.js
  // equivalent here and is intentionally not reproduced. The status flip below is the real
  // effect the frontend depends on.
  const assetCount = await db.collection('Assets').countDocuments({ purchaseOrderNumber: existingPo.purchaseOrderNumber })

  await db.collection('PurchaseOrder').updateOne(
    { _id: existingPo._id },
    { $set: { status: false } },
  )

  return res.status(200).json({
    statusCode: 200,
    message: `Purchase Order ${existingPo.purchaseOrderNumber} expired successfully it has ${assetCount} assets please delete the Records`,
  })
}
