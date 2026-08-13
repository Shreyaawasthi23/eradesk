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
  const {
    name, contactName, contactNumber, contactEmail,
    gstNumber, panNumber, address, pinCode, city, state, country, userId, status, salesIds,
  } = req.body || {}

  const nameCheck = await db.collection('FrontClient').findOne({
    name: { $regex: `^${name}$`, $options: 'i' },
  })
  if (nameCheck) {
    return res.status(200).json({ statusCode: 409, message: 'Front Client already exist! with same Name' })
  }

  const existingUser = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  if (!existingUser) {
    return res.status(200).json({ statusCode: 404, message: 'User not found!' })
  }

  const seq = await nextSequence(db, 'FrontClientSequence', 'front_client_sequence')
  const frontClientId = `FC00${seq}`
  const now = new Date()

  await db.collection('FrontClient').insertOne({
    name: name.trim(),
    contactName,
    contactNumber,
    contactEmail,
    gstNumber: (gstNumber || '').trim(),
    panNumber: (panNumber || '').trim(),
    address,
    pinCode,
    city,
    state,
    country,
    createDate: now,
    modifyDate: now,
    userName: `${existingUser.firstName} ${existingUser.lastName}`,
    userId: existingUser._id.toString(),
    frontClientId,
    status: status === true || status === 'true',
    salesIds: Array.isArray(salesIds) ? salesIds : [],
  })

  return res.status(200).json({ statusCode: 200, message: `Front Client ${frontClientId} Created Successfully!` })
}
