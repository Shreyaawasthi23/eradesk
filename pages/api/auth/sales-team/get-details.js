import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

export default async function handler(req, res) {
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
    createDate: s.createDate,
    userEmail: s.userEmail,
  })
}
