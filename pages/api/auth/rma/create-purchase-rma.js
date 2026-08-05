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

  const { db } = auth
  const { quantity, perUnitPrice, totalAmount, rmaRefId, userId, description } = req.body || {}

  const users = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  const rma = await db.collection('Rma').findOne({ _id: new ObjectId(rmaRefId) })
  if (!users || !rma) {
    return res.status(200).json({ statusCode: 409, message: 'User not found!' })
  }

  const now = new Date()
  await db.collection('RmaPurchase').insertOne({
    quantity,
    perUnitPrice,
    totalAmount,
    description,
    rmaRefId: rma._id.toString(),
    rmaId: rma.rmaId,
    endClientRefId: rma.endClientRefId,
    endClientName: rma.endClientName,
    purchaseOrderNumber: rma.purchaseOrderNumber,
    incidentRefId: rma.incidentRefId,
    incidentId: rma.incidentId,
    createDate: now,
    modifyDate: now,
    userId,
  })

  return res.status(200).json({ statusCode: 200, message: 'Purchase Recorded successfully!!' })
}
