import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole, getRoleMap, resolveUserRoles } from '@/lib/apiAuth'

const ENGINEER_ROLE_ID = new ObjectId('64bf64c6325e302a4a49c7e5')

export default async function handler(req, res) {
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
