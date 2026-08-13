import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const { id } = req.query
  const { name, email, number, status } = req.body || {}
  const { db } = auth

  const existing = await db.collection('SalesTeam').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Participant not found!' })
  }

  await db
    .collection('SalesTeam')
    .updateOne({ _id: new ObjectId(id) }, { $set: { name, email, number, status: status === true || status === 'true' } })

  return res.status(200).json({ statusCode: 200, message: 'Participant details updated successfully!' })
}
