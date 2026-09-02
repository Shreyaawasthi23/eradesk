import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'
import { serializeEndClient } from '@/lib/serializers'

async function create(req, res) {
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
    status: status === true || status === 'true',
    salesIds: Array.isArray(salesIds) ? salesIds : [],
  })

  return res.status(200).json({ statusCode: 200, message: `${endClientId} created successfully!` })
}

async function details(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { id } = req.query
  const c = await auth.db.collection('EndClient').findOne({ _id: new ObjectId(id) })
  if (!c) return res.status(200).json(null)

  return res.status(200).json(serializeEndClient(c))
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

async function getAllPage(req, res) {
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

  const totalElements = await db.collection('EndClient').countDocuments(filter)
  const items = await db
    .collection('EndClient')
    .find(filter)
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  const totalPages = Math.ceil(totalElements / size) || 0
  const content = items.map(serializeEndClient)

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

async function getAll(req, res) {
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
  const items = await auth.db
    .collection('EndClient')
    .find(filter)
    .sort({ createDate: -1 })
    .toArray()

  return res.status(200).json(items.map(serializeEndClient))
}

export default {
  'create': create,
  'details': details,
  'edit': edit,
  'get-all-page': getAllPage,
  'get-all': getAll,
}
