import jwt from 'jsonwebtoken'
import { getTenantDb } from '@/lib/mongodb'

const JWT_SECRET = process.env.JWT_SECRET || 'lrs-era-desk'
const JWT_EXPIRATION_MS = Number(process.env.JWT_EXPIRATION_MS || 32400000)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const tenant = req.headers['x-tenant']
  if (!tenant) {
    return res.status(401).end()
  }

  const { email, password } = req.body || {}

  const db = await getTenantDb(tenant)
  const user = await db.collection('Users').findOne({ email, password, status: true })

  if (!user) {
    return res.status(200).json(null)
  }

  const roles = []
  if (user.roles && user.roles.length) {
    const roleIds = user.roles.map((r) => r.$id || r.oid)
    const roleDocs = await db.collection('roles').find({ _id: { $in: roleIds } }).toArray()
    roleDocs.forEach((r) => roles.push(r.name))
  }

  const token = jwt.sign({ sub: user.email }, JWT_SECRET, {
    algorithm: 'HS512',
    expiresIn: Math.floor(JWT_EXPIRATION_MS / 1000),
  })

  await db.collection('LoginHistory').insertOne({
    userId: user._id,
    email: user.email,
    timestamp: new Date(),
  })

  return res.status(200).json({
    token,
    type: 'Bearer',
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles,
  })
}
