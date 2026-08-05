import { authenticate, hasAnyRole } from '@/lib/apiAuth'

export default async function handler(req, res) {
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
