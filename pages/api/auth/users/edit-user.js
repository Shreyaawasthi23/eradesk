import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

const ROLE_SWITCH = {
  admin: 'ROLE_ADMIN',
  mod: 'ROLE_MODERATOR',
  engineer: 'ROLE_ENGINEER',
}

export default async function handler(req, res) {
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
    for (const r of roles) roleNames.add(ROLE_SWITCH[r] || 'ROLE_USER')
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
