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

  const { rmaId: id, status } = req.query
  const userId = (req.query.userId || '').trim()
  const { db } = auth

  const existingRma = await db.collection('Rma').findOne({ _id: new ObjectId(id) })
  const existingUser = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  if (!existingRma || !existingUser) {
    return res.status(200).json({ statusCode: 409, message: 'RMA not found' })
  }

  const initialStatus = existingRma.status

  if (status === 'CLOSED') {
    const hasPod = await db.collection('RmaPod').findOne({ rmaId: id })
    if (!hasPod) {
      return res.status(200).json({
        statusCode: 409,
        message: `Please upload POD against the RMA #${existingRma.rmaId}`,
      })
    }
  }

  await db.collection('Rma').updateOne({ _id: new ObjectId(id) }, { $set: { status } })

  await db.collection('IncidentNotes').insertOne({
    incidentId: existingRma.incidentRefId,
    note: `${existingUser.email} updated RMA #${existingRma.rmaId} from ${initialStatus} to ${status}`,
    userId: existingUser._id.toString(),
    userEmail: existingUser.email,
    createDate: new Date(),
  })

  return res.status(200).json({ statusCode: 200, message: `${existingRma.rmaId} Updated Successfully` })
}
