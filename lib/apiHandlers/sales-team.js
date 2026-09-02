import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

async function addParticipant(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const { name, email, number, userId, status } = req.body || {}
  const { db } = auth

  const existingUser = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  if (!existingUser) {
    return res.status(200).json({ statusCode: 409, message: 'User not found!' })
  }

  await db.collection('SalesTeam').insertOne({
    name,
    email,
    number,
    status: status === undefined ? true : status === true || status === 'true',
    createDate: new Date(),
    userEmail: existingUser.email,
  })

  return res.status(200).json({ statusCode: 200, message: 'Participant added to Sales Team Successfully!' })
}

async function editParticipant(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const { id } = req.query
  const { name, email, number, status } = req.body || {}
  const { db } = auth

  const existing = await db.collection('SalesTeam').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Participant not found!' })
  }

  await db
    .collection('SalesTeam')
    .updateOne({ _id: new ObjectId(id) }, { $set: { name, email, number, status: status === true || status === 'true' } })

  return res.status(200).json({ statusCode: 200, message: 'Participant details updated successfully!' })
}

async function getAllList(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const { db } = auth
  // Mirrors SalesTeamRepository.findAllList(), which sorts on "CreateDate" (mismatched
  // casing vs the actual "createDate" field) so the sort is effectively a no-op upstream too.
  // Only active participants are offered — inactive ones shouldn't be selectable going forward.
  const items = await db
    .collection('SalesTeam')
    .find({ status: { $ne: false } })
    .toArray()

  const response = items.map((s) => ({
    id: s._id.toString(),
    name: s.name,
    email: s.email,
    number: s.number,
    createDate: s.createDate,
    userEmail: s.userEmail,
  }))

  return res.status(200).json(response)
}

function serialize(s) {
  return {
    id: s._id.toString(),
    name: s.name,
    email: s.email,
    number: s.number,
    status: s.status ?? true,
    createDate: s.createDate,
    userEmail: s.userEmail,
  }
}

async function getAll(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { db } = auth

  const search = (req.query.search || '').trim()
  const status = req.query.status
  const startDate = req.query.startDate
  const endDate = req.query.endDate

  const filter = {}
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ name: regex }, { email: regex }]
  }
  if (status === 'true' || status === 'false') {
    filter.status = status === 'true'
  }
  if (startDate || endDate) {
    filter.createDate = {}
    if (startDate) filter.createDate.$gte = new Date(startDate)
    if (endDate) filter.createDate.$lte = new Date(endDate + 'T23:59:59.999Z')
  }

  const totalElements = await db.collection('SalesTeam').countDocuments(filter)
  const items = await db
    .collection('SalesTeam')
    .find(filter)
    .sort({ createDate: -1, _id: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  const totalPages = Math.ceil(totalElements / size) || 0
  const content = items.map(serialize)

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
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const { id } = req.query
  const { db } = auth
  const s = await db.collection('SalesTeam').findOne({ _id: new ObjectId(id) })
  if (!s) return res.status(200).json(null)

  return res.status(200).json({
    id: s._id.toString(),
    name: s.name,
    email: s.email,
    number: s.number,
    status: s.status ?? true,
    createDate: s.createDate,
    userEmail: s.userEmail,
  })
}

export default {
  'add-participant': addParticipant,
  'edit-participant': editParticipant,
  'get-all-list': getAllList,
  'get-all': getAll,
  'get-details': getDetails,
}
