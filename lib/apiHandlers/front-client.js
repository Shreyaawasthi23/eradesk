import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { ObjectId } from 'mongodb'
import { nextSequence } from '@/lib/sequence'
import { serializeFrontClient } from '@/lib/serializers'

async function checkByName(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER'])) return res.status(403).end()

  const { name } = req.query
  const exists = await auth.db.collection('FrontClient').findOne({ name })

  if (exists) {
    return res.status(200).json({ statusCode: 409, message: 'Front Client already exist! with same name' })
  }
  return res.status(200).json({ statusCode: 200, message: 'Great available!' })
}

async function create(req, res) {
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

async function edit(req, res) {
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
    status: status === true || status === 'true',
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

async function getAllList(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) return res.status(403).end()

  // Dropdown callers pass no status (defaults to active-only). Download/export
  // callers can pass status=all to include inactive records too.
  const status = req.query.status
  const filter = status === 'all' ? {} : { status: true }
  const items = await auth.db.collection('FrontClient').find(filter).toArray()
  return res.status(200).json(items.map(serializeFrontClient))
}

async function getAll(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) return res.status(403).end()

  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { db } = auth

  const search = (req.query.search || '').trim()
  const status = req.query.status

  const filter = {}
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ name: regex }, { contactName: regex }, { contactEmail: regex }]
  }
  if (status === 'true' || status === 'false') {
    filter.status = status === 'true'
  }

  const totalElements = await db.collection('FrontClient').countDocuments(filter)
  const items = await db
    .collection('FrontClient')
    .find(filter)
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  const totalPages = Math.ceil(totalElements / size) || 0
  const content = items.map(serializeFrontClient)

  return res.status(200).json({
    content,
    totalElements,
    totalPages,
    number: page,
    size,
    numberOfElements: content.length,
    first: page === 0,
    last: page >= totalPages - 1,
    empty: content.length === 0,
  })
}

async function getDetails(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { id } = req.query
  const c = await auth.db.collection('FrontClient').findOne({ _id: new ObjectId(id) })
  if (!c) return res.status(200).json(null)

  return res.status(200).json(serializeFrontClient(c))
}

export default {
  'check-by-name': checkByName,
  'create': create,
  'edit': edit,
  'get-all-list': getAllList,
  'get-all': getAll,
  'get-details': getDetails,
}
