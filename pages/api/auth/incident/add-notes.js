import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

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

  const { note, userId, incidentId } = req.query
  const { db } = auth

  const user = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  const incident = await db.collection('Incident').findOne({ _id: new ObjectId(incidentId) })
  if (!user || !incident) {
    return res.status(200).json({ statusCode: 409, message: 'Incident Not Found', additionInformation: '' })
  }

  await db.collection('IncidentNotes').insertOne({
    note,
    incidentId,
    userId,
    userEmail: user.email,
    createDate: new Date(),
  })

  await db.collection('UserPoints').insertOne({
    userId: user._id.toString(),
    points: 1,
    type: 'INCIDENT-NOTES',
    remarks: `${user.email} earned 1 points for adding note to an Incident`,
    createDate: new Date(),
  })

  return res.status(200).json({ statusCode: 200, message: `#${incident.incidentId}`, additionInformation: '' })
}
