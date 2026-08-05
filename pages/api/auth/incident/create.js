import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { generateIncidentId } from '@/lib/incidentId'

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
    incidentDate, serialNumber, problem, make, model, priority, assetType,
    engineerId, poType, contactName, contactEmail, contactNumber, sla,
    pinCode, state, city, fullAddress, userId,
  } = req.body || {}

  const trimmedSerial = (serialNumber || '').trim()
  const existingAsset = await db.collection('Assets').findOne({ serialNumber: trimmedSerial })
  if (!existingAsset) {
    return res.status(200).json({ statusCode: 409, message: 'Serial Number not found!' })
  }

  const lastIncidents = await db.collection('Incident').find({ serialNumber: trimmedSerial }).toArray()
  if (lastIncidents.length) {
    const allClosed = lastIncidents.every((x) => x.status === 'CLOSED' || x.status === 'PENDING FOR RMA CLOSURE')
    if (!allClosed) {
      return res.status(200).json({
        statusCode: 409,
        message: `Incident is still not closed for Serial No ${serialNumber} please close this before logging new`,
      })
    }
  }

  const engineer = await db.collection('Users').findOne({ _id: new ObjectId(engineerId) })
  const users = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  const endClient = await db.collection('EndClient').findOne({ _id: new ObjectId(existingAsset.endClientId) })
  const frontClient = await db.collection('FrontClient').findOne({ _id: new ObjectId(existingAsset.frontClientId) })

  const incidentId = await generateIncidentId(db)
  const now = new Date()

  const newIncident = {
    incidentId,
    incidentDate: incidentDate ? new Date(incidentDate) : now,
    serialNumber: existingAsset.serialNumber,
    problem,
    make,
    model,
    priority,
    assetType,
    engineerId,
    poType,
    status: 'OPEN',
    contactName,
    contactNumber,
    contactEmail,
    sla,
    pinCode,
    state,
    city,
    fullAddress,
    purchaseOrderNumber: existingAsset.purchaseOrderNumber,
    endClientId: endClient._id.toString(),
    endClientName: endClient.name,
    frontClientId: frontClient._id.toString(),
    frontClientName: frontClient.name,
    createDate: now,
    modifyDate: now,
    userId: users._id.toString(),
    userEmail: users.email,
  }

  const result = await db.collection('Incident').insertOne(newIncident)

  // NOTE: mailService.sendIncidentLoggingMail is not yet ported (Mail module pending) — engineer
  // notification email is skipped here.

  await db.collection('UserPoints').insertOne({
    userId,
    points: 2,
    type: 'CREATE-INCIDENT',
    remarks: `${users.email} earned 2 points for creating an Incident`,
    createDate: now,
  })

  await db.collection('SlaTracker').insertOne({
    incidentId,
    incidentRefId: result.insertedId.toString(),
    status: 'OPEN',
    createDate: now,
    userEmail: users.email,
    userId: users._id.toString(),
  })

  return res.status(200).json({ statusCode: 200, message: `Incident Registered ${incidentId}` })
}
