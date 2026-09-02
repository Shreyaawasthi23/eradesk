import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeChange, serializeIncident, serializeProblem } from '@/lib/serializers'

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

  const change = await db.collection('Change').findOne({ _id: new ObjectId(id) })
  if (!change) {
    return res.status(404).json({ statusCode: 404, message: 'Change not found' })
  }

  const incidentIds = (change.linkedIncidentIds || []).map((x) => new ObjectId(x))
  const problemIds = (change.linkedProblemIds || []).map((x) => new ObjectId(x))

  const [linkedIncidents, linkedProblems] = await Promise.all([
    incidentIds.length
      ? db.collection('Incident').find({ _id: { $in: incidentIds } }).toArray()
      : Promise.resolve([]),
    problemIds.length
      ? db.collection('Problem').find({ _id: { $in: problemIds } }).toArray()
      : Promise.resolve([]),
  ])

  return res.status(200).json({
    ...serializeChange(change),
    linkedIncidents: linkedIncidents.map(serializeIncident),
    linkedProblems: linkedProblems.map(serializeProblem),
  })
}
