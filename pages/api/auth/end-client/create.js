import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { db } = auth
  const { name, contactName, contactNumber, contactEmail, frontClientId, userId, status, salesIds } = req.body || {}

  const existing = await db.collection('EndClient').findOne({ name })
  if (existing) {
    return res.status(200).json({ statusCode: 409, message: 'End Client already exist!' })
  }

  const user = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  if (!user) {
    return res.status(200).json({ statusCode: 404, message: 'User not found!' })
  }

  const seq = await nextSequence(db, 'EndClientSequence', 'end_client_sequence')
  const endClientId = `EC00${seq}`
  const now = new Date()

  await db.collection('EndClient').insertOne({
    name: name.trim(),
    contactName,
    contactNumber,
    contactEmail,
    endClientId,
    frontClientId,
    createDate: now,
    modifyDate: now,
    userName: `${user.firstName} ${user.lastName}`,
    userId: user._id.toString(),
    status: !!status,
    salesIds: Array.isArray(salesIds) ? salesIds : [],
  })

  return res.status(200).json({ statusCode: 200, message: `${endClientId} created successfully!` })
}
