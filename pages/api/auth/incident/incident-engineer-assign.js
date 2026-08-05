import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER'])) return res.status(403).end()

  const { incidentId: id, engineerId, userId } = req.query
  const { db } = auth

  const incident = await db.collection('Incident').findOne({ _id: new ObjectId(id) })
  const existingEngineer = incident ? await db.collection('Users').findOne({ _id: new ObjectId(incident.engineerId) }) : null
  const newEngineer = await db.collection('Users').findOne({ _id: new ObjectId(engineerId) })
  const user = await db.collection('Users').findOne({ _id: new ObjectId(userId) })

  if (!user || !incident || !newEngineer) {
    return res.status(200).json({ statusCode: 409, message: 'Incident or User Not Found', additionInformation: '' })
  }

  const now = new Date()

  await db.collection('Incident').updateOne(
    { _id: new ObjectId(id) },
    { $set: { engineerId, modifyDate: now } },
  )

  await db.collection('IncidentNotes').insertOne({
    incidentId: id,
    note: `${user.email} assigned Incident #${incident.incidentId} from Engineer - ${existingEngineer?.email} to ${newEngineer.email}`,
    userId,
    userEmail: user.email,
    createDate: now,
  })

  await db.collection('UserPoints').insertOne({
    userId: user._id.toString(),
    points: 2,
    type: 'INCIDENT-UPDATE',
    remarks: `${user.email} earned 2 points for updating an Incident's Engineer`,
    createDate: now,
  })

  // NOTE: mailService.incidentAssignMail is not yet ported (Mail module pending) — engineer
  // notification email is skipped here.

  return res.status(200).json({ statusCode: 200, message: 'Status Updated Successfully', additionInformation: '' })
}
