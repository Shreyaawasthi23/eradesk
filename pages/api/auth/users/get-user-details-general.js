import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole, getRoleMap, resolveUserRoles } from '@/lib/apiAuth'

export default async function handler(req, res) {
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
