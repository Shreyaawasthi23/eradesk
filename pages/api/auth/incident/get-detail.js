import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeIncident } from '@/lib/serializers'

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
  const i = await auth.db.collection('Incident').findOne({ _id: new ObjectId(id) })
  if (!i) return res.status(200).json(null)

  return res.status(200).json(serializeIncident(i))
}
