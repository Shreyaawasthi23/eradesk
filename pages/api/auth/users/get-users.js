import { authenticate, hasAnyRole, getRoleMap, resolveUserRoles } from '@/lib/apiAuth'
import { ObjectId } from 'mongodb'

function serializeUser(u, roleMap) {
  return {
    id: u._id.toString(),
    username: u.username,
    email: u.email,
    password: u.password,
    roles: resolveUserRoles(u, roleMap),
    firstName: u.firstName,
    status: u.status,
    lastName: u.lastName,
    createDate: u.createDate,
    modifyDate: u.modifyDate,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MASTER'])) return res.status(403).end()

  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { db } = auth

  const search = (req.query.search || '').trim()
  const role = (req.query.role || '').trim()
  const startDate = req.query.startDate
  const endDate = req.query.endDate

  const filter = {}
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ username: regex }, { email: regex }]
  }
  if (startDate || endDate) {
    filter.createDate = {}
    if (startDate) filter.createDate.$gte = new Date(startDate)
    if (endDate) filter.createDate.$lte = new Date(endDate + 'T23:59:59.999Z')
  }
  if (role) {
    const roleDoc = await db.collection('roles').findOne({ name: role })
    filter['roles.$id'] = roleDoc ? roleDoc._id : new ObjectId()
  }

  const totalElements = await db.collection('Users').countDocuments(filter)
  const users = await db
    .collection('Users')
    .find(filter)
    .skip(page * size)
    .limit(size)
    .toArray()

  const roleMap = await getRoleMap(db)
  const totalPages = Math.ceil(totalElements / size) || 0
  const content = users.map((u) => serializeUser(u, roleMap))

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
