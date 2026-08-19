import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER'])) return res.status(403).end()

  const { id, remarks } = req.query
  const { db } = auth
  const { partNumber, description, quantity, status, contactName, contactNumber, contactEmail, userId } = req.body || {}

  const existingRma = await db.collection('Rma').findOne({ _id: new ObjectId(id) })
  if (!existingRma) {
    return res.status(200).json({ statusCode: 409, message: 'RMA not found' })
  }

  const existingUser = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  if (!existingUser) {
    return res.status(200).json({ statusCode: 409, message: 'User Not Found!' })
  }

  await db.collection('Rma').updateOne(
    { _id: new ObjectId(id) },
    { $set: { partNumber, description, quantity, status, contactName, contactNumber, contactEmail, modifyDate: new Date() } },
  )

  await db.collection('RmaChangeLog').insertOne({
    createDate: new Date(),
    remarks,
    userName: `${existingUser.firstName} ${existingUser.lastName}`,
    userId: existingUser._id.toString(),
    rmaId: existingRma.rmaId,
  })

  return res.status(200).json({ statusCode: 200, message: `${existingRma.rmaId} Updated Successfully` })
}
