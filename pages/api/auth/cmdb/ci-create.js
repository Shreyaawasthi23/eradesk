import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'

const TYPES = ['SERVER', 'DESKTOP', 'LAPTOP', 'APPLICATION', 'DATABASE', 'VIRTUAL_MACHINE', 'CLOUD_RESOURCE', 'NETWORK_DEVICE', 'OTHER']

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

  const { db, user } = auth
  const { name, type, assetId, ipAddress, macAddress, operatingSystem, version, owner, vendor, description } =
    req.body || {}

  if (!name || !type) {
    return res.status(200).json({ statusCode: 409, message: 'Name and type are required' })
  }
  if (!TYPES.includes(type)) {
    return res.status(200).json({ statusCode: 409, message: 'Invalid CI type' })
  }

  if (assetId) {
    const asset = await db.collection('Assets').findOne({ _id: new ObjectId(assetId) })
    if (!asset) {
      return res.status(200).json({ statusCode: 409, message: 'Linked asset not found' })
    }
  }

  const seq = await nextSequence(db, 'CISequence', 'ci_sequence')
  const ciId = `CI-${String(seq).padStart(6, '0')}`
  const now = new Date()

  const newCI = {
    ciId,
    name,
    type,
    status: 'ACTIVE',
    assetId: assetId || null,
    ipAddress: ipAddress || '',
    macAddress: macAddress || '',
    operatingSystem: operatingSystem || '',
    version: version || '',
    owner: owner || '',
    vendor: vendor || '',
    description: description || '',
    createDate: now,
    modifyDate: now,
    userId: user._id.toString(),
    userEmail: user.email,
  }

  const result = await db.collection('ConfigurationItem').insertOne(newCI)

  return res
    .status(200)
    .json({ statusCode: 200, message: `Configuration Item created ${ciId}`, id: result.insertedId.toString() })
}
