import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER'])) return res.status(403).end()

  const { id, userId } = req.query
  const { db } = auth
  const {
    incidentDate, serialNumber, problem, make, model, priority, assetType,
    poType, contactName, contactEmail, contactNumber, sla, pinCode, state, city, fullAddress,
  } = req.body || {}

  const existingIncident = await db.collection('Incident').findOne({ _id: new ObjectId(id) })
  const users = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  if (!existingIncident || !users) {
    return res.status(200).json({ statusCode: 409, message: 'Incident Not Found' })
  }

  const existingAsset = await db.collection('Assets').findOne({
    serialNumber: { $regex: serialNumber, $options: 'i' },
  })
  if (!existingAsset) {
    return res.status(200).json({ statusCode: 409, message: 'Serial Number not found!' })
  }

  const endClient = await db.collection('EndClient').findOne({ _id: new ObjectId(existingAsset.endClientId) })
  const frontClient = await db.collection('FrontClient').findOne({ _id: new ObjectId(existingAsset.frontClientId) })

  const update = {
    serialNumber,
    incidentDate: incidentDate ? new Date(incidentDate) : existingIncident.incidentDate,
    problem,
    make,
    model,
    priority,
    assetType,
    poType,
    contactName,
    contactEmail,
    contactNumber,
    sla,
    pinCode,
    state,
    city,
    fullAddress,
    endClientId: endClient._id.toString(),
    endClientName: endClient.name,
    purchaseOrderNumber: existingAsset.purchaseOrderNumber,
    frontClientId: frontClient._id.toString(),
    frontClientName: frontClient.name,
    modifyDate: new Date(),
  }

  await db.collection('Incident').updateOne({ _id: new ObjectId(id) }, { $set: update })

  return res.status(200).json({ statusCode: 200, message: 'Incident edited successfully' })
}
