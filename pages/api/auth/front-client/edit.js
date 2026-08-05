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

  const { id, remarks } = req.query
  if (!id && !remarks) {
    return res.status(200).json({ statusCode: 409, message: 'Client Id or Remarks are empty' })
  }

  const { db } = auth
  const {
    name, contactName, contactNumber, contactEmail,
    gstNumber, panNumber, address, pinCode, city, state, country, userId, status, salesIds,
  } = req.body || {}

  const user = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  const frontClient = await db.collection('FrontClient').findOne({ _id: new ObjectId(id) })

  const update = {
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
    modifyDate: new Date(),
    status: !!status,
    salesIds: Array.isArray(salesIds) ? salesIds : [],
  }

  if (name.trim() !== frontClient.name.trim()) {
    const exist = await db.collection('FrontClient').findOne({
      name: { $regex: `^${name.trim()}$`, $options: 'i' },
    })
    if (exist) {
      return res.status(200).json({ statusCode: 409, message: `${name} already exist!` })
    }
    update.name = name.trim()
  }

  await db.collection('FrontClient').updateOne({ _id: new ObjectId(id) }, { $set: update })

  await db.collection('FrontClientChangeLogs').insertOne({
    createDate: new Date(),
    userId: user._id.toString(),
    userName: `${user.firstName} ${user.lastName}`,
    remarks,
    frontClientId: frontClient.frontClientId,
  })

  return res.status(200).json({ statusCode: 200, message: `${frontClient.frontClientId} edited successfully!` })
}
