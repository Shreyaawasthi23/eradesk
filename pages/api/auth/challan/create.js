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
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER'])) return res.status(403).end()

  const { db } = auth
  const {
    fromName, fromAddressLane, fromAddressLaneExt, fromGst, fromContact,
    toName, toAddressLane, toAddressLaneExt, toContactName, toContact,
    date, poNumber, rmaId, rmaRefId, incidentId, incidentRefId, deliveredBy,
    itemDescription, quantity, remarks, userId,
  } = req.body || {}

  const users = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  if (!users) {
    return res.status(200).json({ statusCode: 409, message: 'User not found!' })
  }

  const seq = await nextSequence(db, 'DeliveryChallanSequence', 'challan_sequence')
  const challanNo = `DC00${seq}`
  const now = new Date()

  await db.collection('DeliveryChallan').insertOne({
    fromName, fromAddressLane, fromAddressLaneExt, fromGst, fromContact,
    toName, toAddressLane, toAddressLaneExt, toContactName, toContact,
    date: date ? new Date(date) : now,
    poNumber,
    rmaId,
    rmaRefId,
    incidentId,
    incidentRefId,
    deliveredBy,
    itemDescription,
    quantity,
    remarks,
    createDate: now,
    modifyDate: now,
    userEmail: users.email,
    userId: users._id.toString(),
    challanNo,
    status: 'Pending',
  })

  return res.status(200).json({ statusCode: 200, message: `${challanNo} created successfully!` })
}
