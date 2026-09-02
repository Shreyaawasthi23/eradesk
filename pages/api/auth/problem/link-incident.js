import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { id } = req.query
  const { db } = auth
  const { incidentId } = req.body || {}

  if (!incidentId) {
    return res.status(200).json({ statusCode: 409, message: 'incidentId is required' })
  }

  const problem = await db.collection('Problem').findOne({ _id: new ObjectId(id) })
  if (!problem) {
    return res.status(200).json({ statusCode: 409, message: 'Problem not found' })
  }

  const incident = await db.collection('Incident').findOne({ _id: new ObjectId(incidentId) })
  if (!incident) {
    return res.status(200).json({ statusCode: 409, message: 'Incident not found' })
  }

  if ((problem.linkedIncidentIds || []).includes(incidentId)) {
    return res.status(200).json({ statusCode: 409, message: 'Incident is already linked to this problem' })
  }

  await db
    .collection('Problem')
    .updateOne({ _id: new ObjectId(id) }, { $addToSet: { linkedIncidentIds: incidentId }, $set: { modifyDate: new Date() } })

  return res.status(200).json({ statusCode: 200, message: `Linked incident ${incident.incidentId}` })
}
