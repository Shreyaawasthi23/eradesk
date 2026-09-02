import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeChallan, serializeDeliveryTracking, serializePodDetails } from '@/lib/serializers'
import { nextSequence } from '@/lib/sequence'
import { toPageResponse } from '@/lib/pagination'

async function addDeliveryStatus(req, res) {
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

async function byIncident(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { incidentId } = req.query
  const items = await auth.db.collection('DeliveryChallan').find({ incidentRefId: incidentId }).toArray()

  return res.status(200).json(items.map(serializeChallan))
}

async function create(req, res) {
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

async function details(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER'])) return res.status(403).end()

  const { id } = req.query
  const c = await auth.db.collection('DeliveryChallan').findOne({ _id: new ObjectId(id) })
  if (!c) return res.status(200).json(null)

  return res.status(200).json(serializeChallan(c))
}

async function edit(req, res) {
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

async function getAllPage(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER'])) return res.status(403).end()

  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { db } = auth

  const startDate = req.query.startDate
  const endDate = req.query.endDate

  const filter = {}
  if (startDate || endDate) {
    filter.date = {}
    if (startDate) filter.date.$gte = new Date(startDate)
    if (endDate) filter.date.$lte = new Date(endDate + 'T23:59:59.999Z')
  }

  const totalElements = await db.collection('DeliveryChallan').countDocuments(filter)
  const items = await db
    .collection('DeliveryChallan')
    .find(filter)
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeChallan), totalElements, page, size))
}

async function getByIncident(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER'])) return res.status(403).end()

  const { incidentId } = req.query
  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { db } = auth

  const filter = { incidentId: { $regex: incidentId, $options: 'i' } }
  const totalElements = await db.collection('DeliveryChallan').countDocuments(filter)
  const items = await db.collection('DeliveryChallan').find(filter).skip(page * size).limit(size).toArray()

  return res.status(200).json(toPageResponse(items.map(serializeChallan), totalElements, page, size))
}

async function getByRma(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER'])) return res.status(403).end()

  const { rmaNo } = req.query
  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { db } = auth

  const filter = { rmaId: { $regex: rmaNo, $options: 'i' } }
  const totalElements = await db.collection('DeliveryChallan').countDocuments(filter)
  const items = await db.collection('DeliveryChallan').find(filter).skip(page * size).limit(size).toArray()

  return res.status(200).json(toPageResponse(items.map(serializeChallan), totalElements, page, size))
}

async function getDeliveryStatus(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER'])) return res.status(403).end()

  const { id } = req.query
  const items = await auth.db.collection('DeliveryTracking').find({ challanId: id }).toArray()

  return res.status(200).json(items.map(serializeDeliveryTracking))
}

async function getPodDetails(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER'])) return res.status(403).end()

  const { id } = req.query
  const pod = await auth.db.collection('PodDetails').findOne({ challanId: id })
  if (!pod) return res.status(200).json(null)

  return res.status(200).json(serializePodDetails(pod))
}

export default {
  'add-delivery-status': addDeliveryStatus,
  'by-incident': byIncident,
  'create': create,
  'details': details,
  'edit': edit,
  'get-all-page': getAllPage,
  'get-by-incident': getByIncident,
  'get-by-rma': getByRma,
  'get-delivery-status': getDeliveryStatus,
  'get-pod-details': getPodDetails,
}
