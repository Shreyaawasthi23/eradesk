import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER'])) return res.status(403).end()

  const { id, status } = req.query
  const { db } = auth

  const challan = await db.collection('DeliveryChallan').findOne({ _id: new ObjectId(id) })
  if (!challan) {
    return res.status(200).json({ statusCode: 409, message: 'Challan not found!' })
  }

  const user = await db.collection('Users').findOne({ _id: new ObjectId(req.query.userId) })
  if (!user) {
    return res.status(200).json({ statusCode: 409, message: 'User not found!' })
  }

  await db.collection('DeliveryTracking').insertOne({
    challanNo: challan.challanNo,
    challanId: challan._id.toString(),
    status,
    email: user.email,
    userId: user._id.toString(),
    createDate: new Date(),
  })

  return res.status(200).json({ statusCode: 200, message: 'Status added successfully!' })
}
