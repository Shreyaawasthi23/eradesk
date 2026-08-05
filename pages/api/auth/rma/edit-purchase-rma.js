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

  const { id } = req.query
  const { db } = auth
  const { quantity, perUnitPrice, totalAmount, userId, description } = req.body || {}

  const users = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  const purchase = await db.collection('RmaPurchase').findOne({ _id: new ObjectId(id) })
  if (!users || !purchase) {
    return res.status(200).json({ statusCode: 409, message: 'User or Purchase not found!' })
  }

  await db.collection('RmaPurchase').updateOne(
    { _id: new ObjectId(id) },
    { $set: { quantity, perUnitPrice, totalAmount, description, modifyDate: new Date() } },
  )

  return res.status(200).json({ statusCode: 200, message: 'Purchase updated successfully!' })
}
