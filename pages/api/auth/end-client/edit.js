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
    return res.status(200).json({ statusCode: 404, message: 'End ClientId or Remarks are empty' })
  }

  const { db } = auth
  const { name, contactNumber, contactEmail, frontClientId, userId, status, salesIds } = req.body || {}

  const user = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  const endClient = await db.collection('EndClient').findOne({ _id: new ObjectId(id) })

  const update = {
    contactNumber,
    contactEmail,
    frontClientId,
    status: status === true || status === 'true',
    modifyDate: new Date(),
    salesIds: Array.isArray(salesIds) ? salesIds : [],
  }

  if (name !== endClient.name) {
    const checkByName = await db.collection('EndClient').findOne({ name: name.trim() })
    if (checkByName) {
      return res.status(200).json({
        statusCode: 409,
        message: `EndClient already exist with same name in ${checkByName.endClientId}`,
      })
    }
    update.name = name.trim()
  }

  await db.collection('EndClient').updateOne({ _id: new ObjectId(id) }, { $set: update })

  await db.collection('EndClientChangeLogs').insertOne({
    createDate: new Date(),
    endClientId: endClient.endClientId,
    remarks,
    userId: user._id.toString(),
    userName: `${user.firstName} ${user.lastName}`,
  })

  return res.status(200).json({ statusCode: 200, message: `${endClient.endClientId} edited successfully!` })
}
