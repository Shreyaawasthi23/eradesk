import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER'])) return res.status(403).end()

  const { db } = auth
  const {
    incidentRefId, endClientRefId, purchaseOrderNumber, incidentId, make, model, serialNo,
    endClientName, contactName, contactNumber, contactEmail, fullAddress, city, state, pinCode,
    partNumber, description, quantity, userId, userEmail,
  } = req.body || {}

  const users = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  if (!users) {
    return res.status(200).json({ statusCode: 409, message: 'User not found!' })
  }

  const seq = await nextSequence(db, 'RmaSequence', 'rma_sequence')
  const rmaId = `RMA00${seq}`
  const now = new Date()

  const result = await db.collection('Rma').insertOne({
    incidentRefId,
    endClientRefId,
    purchaseOrderNumber,
    incidentId,
    make,
    model,
    serialNo,
    endClientName,
    contactName,
    contactNumber,
    contactEmail,
    fullAddress,
    city,
    state,
    pinCode,
    partNumber,
    description,
    quantity,
    userId,
    userEmail,
    createDate: now,
    modifyDate: now,
    rmaId,
    status: 'PENDING',
  })

  await db.collection('IncidentNotes').insertOne({
    incidentId: incidentRefId,
    note: `${users.email} created a new RMA for ${rmaId}`,
    userId: users._id.toString(),
    userEmail: users.email,
    createDate: now,
  })

  // NOTE: mailService.sendRmaMail is not yet ported (Mail module pending) — RMA notification
  // email is skipped here.

  return res.status(200).json({ statusCode: 200, message: `${rmaId} is registered successfully` })
}
