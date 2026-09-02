import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) {
    return res.status(403).end()
  }

  const { id } = req.query
  const { db } = auth

  const result = await db.collection('Holiday').deleteOne({ _id: new ObjectId(id) })
  if (!result.deletedCount) {
    return res.status(200).json({ statusCode: 409, message: 'Holiday not found' })
  }

  return res.status(200).json({ statusCode: 200, message: 'Holiday removed' })
}
