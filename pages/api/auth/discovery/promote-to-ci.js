import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'

const DEVICE_TYPE_TO_CI_TYPE = {
  SERVER: 'SERVER',
  DESKTOP: 'DESKTOP',
  LAPTOP: 'LAPTOP',
  PRINTER: 'OTHER',
  ROUTER: 'NETWORK_DEVICE',
  SWITCH: 'NETWORK_DEVICE',
  OTHER: 'OTHER',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { id } = req.query
  const { db, user } = auth

  const device = await db.collection('DiscoveredDevice').findOne({ _id: new ObjectId(id) })
  if (!device) {
    return res.status(200).json({ statusCode: 409, message: 'Discovered device not found' })
  }
  if (device.status === 'PROMOTED') {
    return res.status(200).json({ statusCode: 409, message: 'Device has already been promoted to a CI' })
  }

  const seq = await nextSequence(db, 'CISequence', 'ci_sequence')
  const ciId = `CI-${String(seq).padStart(6, '0')}`
  const now = new Date()

  const newCI = {
    ciId,
    name: device.hostname || device.ip,
    type: DEVICE_TYPE_TO_CI_TYPE[device.deviceType] || 'OTHER',
    status: 'ACTIVE',
    assetId: null,
    ipAddress: device.ip,
    macAddress: device.mac,
    operatingSystem: device.os,
    version: '',
    owner: '',
    vendor: device.manufacturer,
    description: `Discovered via ${device.discoveryJobId}. Model: ${device.model || 'unknown'}`,
    createDate: now,
    modifyDate: now,
    userId: user._id.toString(),
    userEmail: user.email,
  }

  const result = await db.collection('ConfigurationItem').insertOne(newCI)

  await db.collection('DiscoveredDevice').updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: 'PROMOTED', promotedCIId: result.insertedId.toString() } },
  )

  return res.status(200).json({
    statusCode: 200,
    message: `Promoted to Configuration Item ${ciId}`,
    ciId: result.insertedId.toString(),
  })
}
