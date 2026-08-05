import { getTenantDb } from '@/lib/mongodb'

const ROLE_SWITCH = {
  admin: 'ROLE_ADMIN',
  mod: 'ROLE_MODERATOR',
  engineer: 'ROLE_ENGINEER',
  user: 'ROLE_ENGINEER',
}

export default async function handler(req, res) {
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
    for (const r of roles) roleNames.add(ROLE_SWITCH[r] || 'ROLE_USER')
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
    status: false,
    createDate: now,
    modifyDate: now,
    _class: 'com.assist.java.multitenancy.entity.Users',
  })

  return res.status(200).json({ message: 'User registered successfully!' })
}
