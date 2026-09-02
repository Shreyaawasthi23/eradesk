import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeProblem, serializeIncident, serializeChange } from '@/lib/serializers'

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

  const problem = await db.collection('Problem').findOne({ _id: new ObjectId(id) })
  if (!problem) {
    return res.status(404).json({ statusCode: 404, message: 'Problem not found' })
  }

  const incidentIds = (problem.linkedIncidentIds || []).map((x) => new ObjectId(x))
  const changeIds = (problem.linkedChangeIds || []).map((x) => new ObjectId(x))

  const [linkedIncidents, linkedChanges] = await Promise.all([
    incidentIds.length
      ? db.collection('Incident').find({ _id: { $in: incidentIds } }).toArray()
      : Promise.resolve([]),
    changeIds.length
      ? db.collection('Change').find({ _id: { $in: changeIds } }).toArray()
      : Promise.resolve([]),
  ])

  return res.status(200).json({
    ...serializeProblem(problem),
    linkedIncidents: linkedIncidents.map(serializeIncident),
    linkedChanges: linkedChanges.map(serializeChange),
  })
}
