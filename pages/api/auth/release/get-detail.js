import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeRelease, serializeChange, serializeProblem, serializeIncident } from '@/lib/serializers'

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

  const release = await db.collection('Release').findOne({ _id: new ObjectId(id) })
  if (!release) {
    return res.status(404).json({ statusCode: 404, message: 'Release not found' })
  }

  const changeIds = (release.linkedChangeIds || []).map((x) => new ObjectId(x))
  const problemIds = (release.linkedProblemIds || []).map((x) => new ObjectId(x))
  const incidentIds = (release.linkedIncidentIds || []).map((x) => new ObjectId(x))

  const [linkedChanges, linkedProblems, linkedIncidents] = await Promise.all([
    changeIds.length ? db.collection('Change').find({ _id: { $in: changeIds } }).toArray() : Promise.resolve([]),
    problemIds.length ? db.collection('Problem').find({ _id: { $in: problemIds } }).toArray() : Promise.resolve([]),
    incidentIds.length ? db.collection('Incident').find({ _id: { $in: incidentIds } }).toArray() : Promise.resolve([]),
  ])

  return res.status(200).json({
    ...serializeRelease(release),
    linkedChanges: linkedChanges.map(serializeChange),
    linkedProblems: linkedProblems.map(serializeProblem),
    linkedIncidents: linkedIncidents.map(serializeIncident),
  })
}
