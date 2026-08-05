import { authenticate, hasAnyRole } from '@/lib/apiAuth'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER'])) return res.status(403).end()

  const { name } = req.query
  const exists = await auth.db.collection('FrontClient').findOne({ name })

  if (exists) {
    return res.status(200).json({ statusCode: 409, message: 'Front Client already exist! with same name' })
  }
  return res.status(200).json({ statusCode: 200, message: 'Great available!' })
}
