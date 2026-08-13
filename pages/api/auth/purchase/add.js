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

  const { db } = auth
  const {
    endClientId, purchaseOrderNumber, contactName, contactNumber, contactEmail,
    startDate, endDate, poReceiveDate, type, userId, status, value, salesId,
  } = req.body || {}

  const trimmedPo = (purchaseOrderNumber || '').trim()
  const exists = await db.collection('PurchaseOrder').findOne({ purchaseOrderNumber: trimmedPo })
  if (exists) {
    return res.status(200).json({ statusCode: 409, message: 'Purchase Order already exist!' })
  }

  const user = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  if (!user) {
    return res.status(200).json({ statusCode: 404, message: 'User not found' })
  }

  const endClient = await db.collection('EndClient').findOne({ _id: new ObjectId(endClientId) })
  const now = new Date()

  await db.collection('PurchaseOrder').insertOne({
    endClientId,
    frontClientId: endClient.frontClientId,
    purchaseOrderNumber: trimmedPo,
    contactName: (contactName || '').trim(),
    contactNumber: (contactNumber || '').trim(),
    contactEmail: (contactEmail || '').trim(),
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    poReceiveDate,
    type,
    createDate: now,
    modifyDate: now,
    userId: user._id.toString(),
    userName: `${user.firstName} ${user.lastName}`,
    status: status === true || status === 'true',
    value,
    salesId,
  })

  return res.status(200).json({ statusCode: 200, message: 'Purchase Order added successfully' })
}
