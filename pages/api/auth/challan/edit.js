import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER'])) return res.status(403).end()

  const { id, remarks } = req.query
  const { db } = auth
  const {
    fromName, fromAddressLane, fromAddressLaneExt, fromGst, fromContact,
    toName, toAddressLane, toAddressLaneExt, toContactName, toContact,
    date, deliveredBy, itemDescription, quantity, status, userId,
  } = req.body || {}

  const existingChallan = await db.collection('DeliveryChallan').findOne({ _id: new ObjectId(id) })
  if (!existingChallan) {
    return res.status(200).json({ statusCode: 409, message: 'Challan not found!' })
  }

  const users = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  if (!users) {
    return res.status(200).json({ statusCode: 409, message: 'User not found!' })
  }

  await db.collection('DeliveryChallan').updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        fromName, fromAddressLane, fromAddressLaneExt, fromGst, fromContact,
        toName, toAddressLane, toAddressLaneExt, toContactName, toContact,
        date: date ? new Date(date) : existingChallan.date,
        deliveredBy,
        itemDescription,
        quantity,
        remarks,
        modifyDate: new Date(),
        status,
      },
    },
  )

  await db.collection('ChallanChangeLog').insertOne({
    challanNo: existingChallan.challanNo,
    userName: users.email,
    userId: users._id.toString(),
    createDate: new Date(),
    remarks,
  })

  return res.status(200).json({ statusCode: 200, message: `DC edited successfully!${existingChallan.challanNo}` })
}
