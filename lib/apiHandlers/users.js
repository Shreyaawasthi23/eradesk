import { authenticate, hasAnyRole, getRoleMap, resolveUserRoles } from '@/lib/apiAuth'
import { ObjectId } from 'mongodb'
import { getTenantDb } from '@/lib/mongodb'

async function checkEmail(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MASTER'])) return res.status(403).end()

  const { email } = req.query
  const exists = await auth.db.collection('Users').findOne({ email })

  if (exists) {
    return res.status(200).json({ statusCode: 409, message: 'Email already exist!' })
  }
  return res.status(200).json({ statusCode: 200, message: 'Available!' })
}

async function checkUsername(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MASTER'])) return res.status(403).end()

  const { username } = req.query
  if (!username || username.length < 6) {
    return res.status(200).json({ statusCode: 409, message: 'Username length must be more than 6 letters' })
  }

  const exists = await auth.db.collection('Users').findOne({
    username: { $regex: `^${username}$`, $options: 'i' },
  })

  if (exists) {
    return res.status(200).json({ statusCode: 409, message: 'Username already exist!' })
  }
  return res.status(200).json({ statusCode: 200, message: 'Available!' })
}

const ROLE_SWITCH__editUser = {
  admin: 'ROLE_ADMIN',
  mod: 'ROLE_MODERATOR',
  engineer: 'ROLE_ENGINEER',
}

async function editUser(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const { id } = req.query
  const { username, userEmail, roles, password, firstName, lastName, status } = req.body || {}
  const { db } = auth

  const update = {
    firstName,
    lastName,
    password,
    modifyDate: new Date(),
    status: status === true || status === 'true',
  }

  let extraMessage = ''
  const usernameTaken = await db.collection('Users').findOne({ username, _id: { $ne: new ObjectId(id) } })
  if (usernameTaken) {
    extraMessage = 'but Username already exist!'
  } else {
    update.username = username
  }

  if (userEmail) {
    const emailTaken = await db
      .collection('Users')
      .findOne({ email: userEmail, _id: { $ne: new ObjectId(id) } })
    if (emailTaken) {
      extraMessage = (extraMessage ? extraMessage + ' ' : 'but ') + 'Email already exist!'
    } else {
      update.email = userEmail
    }
  }

  if (roles && roles.length > 0) {
    const roleNames = new Set()
    for (const r of roles) roleNames.add(ROLE_SWITCH__editUser[r] || 'ROLE_USER')
    const roleDocs = await db
      .collection('roles')
      .find({ name: { $in: [...roleNames] } })
      .toArray()
    update.roles = roleDocs.map((r) => ({ $ref: 'roles', $id: r._id }))
  }

  await db.collection('Users').updateOne({ _id: new ObjectId(id) }, { $set: update })

  return res.status(200).json({
    statusCode: 200,
    message: `${update.username || username} Updated Successfully ${extraMessage}`,
  })
}

const ENGINEER_ROLE_ID = new ObjectId('64bf64c6325e302a4a49c7e5')

async function getEngineers(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { db } = auth
  const users = await db
    .collection('Users')
    .find({ 'roles.$id': ENGINEER_ROLE_ID, status: true })
    .toArray()
  const roleMap = await getRoleMap(db)

  const response = users.map((u) => ({
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
  }))

  return res.status(200).json(response)
}

async function getUserDetailsGeneral(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { id } = req.query
  const { db } = auth
  const user = await db.collection('Users').findOne({ _id: new ObjectId(id) })
  if (!user) return res.status(200).json(null)

  const roleMap = await getRoleMap(db)

  return res.status(200).json({
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    roles: resolveUserRoles(user, roleMap),
    firstName: user.firstName,
    status: user.status,
    lastName: user.lastName,
  })
}

async function getUserDetails(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const { id } = req.query
  const { db } = auth
  const user = await db.collection('Users').findOne({ _id: new ObjectId(id) })
  if (!user) return res.status(200).json(null)

  const roleMap = await getRoleMap(db)

  return res.status(200).json({
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    password: user.password,
    roles: resolveUserRoles(user, roleMap),
    firstName: user.firstName,
    status: user.status,
    lastName: user.lastName,
    createDate: user.createDate,
    modifyDate: user.modifyDate,
  })
}

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

async function getUsers(req, res) {
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
    .sort({ createDate: -1 })
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

const ROLE_SWITCH__signup = {
  admin: 'ROLE_ADMIN',
  mod: 'ROLE_MODERATOR',
  engineer: 'ROLE_ENGINEER',
  user: 'ROLE_USER',
}

async function signup(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const tenant = req.headers['x-tenant']
  if (!tenant) return res.status(401).end()

  const db = await getTenantDb(tenant)
  const { username, email, roles, password, firstName, lastName } = req.body || {}

  if (await db.collection('Users').findOne({ username })) {
    return res
      .status(400)
      .json({ message: 'It looks like the user account you are trying to create with username already exists' })
  }
  if (await db.collection('Users').findOne({ email })) {
    return res
      .status(400)
      .json({ message: 'It looks like the user account you are trying to create with email already exists' })
  }

  const roleNames = new Set()
  if (!roles) {
    roleNames.add('ROLE_USER')
  } else {
    for (const r of roles) roleNames.add(ROLE_SWITCH__signup[r] || 'ROLE_USER')
  }

  const roleDocs = await db
    .collection('roles')
    .find({ name: { $in: [...roleNames] } })
    .toArray()
  const roleRefs = roleDocs.map((r) => ({ $ref: 'roles', $id: r._id }))

  const now = new Date()
  await db.collection('Users').insertOne({
    username,
    email,
    password,
    roles: roleRefs,
    firstName,
    lastName,
    status: true,
    createDate: now,
    modifyDate: now,
    _class: 'com.assist.java.multitenancy.entity.Users',
  })

  return res.status(200).json({ message: 'User registered successfully!' })
}

export default {
  'check-email': checkEmail,
  'check-username': checkUsername,
  'edit-user': editUser,
  'get-engineers': getEngineers,
  'get-user-details-general': getUserDetailsGeneral,
  'get-user-details': getUserDetails,
  'get-users': getUsers,
  'signup': signup,
}
