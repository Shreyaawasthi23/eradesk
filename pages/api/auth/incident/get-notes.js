import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeIncidentNote } from '@/lib/serializers'

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

  const { incidentId } = req.query
  const notes = await auth.db
    .collection('IncidentNotes')
    .find({ incidentId })
    .sort({ createDate: -1 })
    .toArray()

  return res.status(200).json(notes.map(serializeIncidentNote))
}
