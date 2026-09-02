import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

const STATUSES = ['ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE', 'RETIRED']

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
  const { db } = auth
  const { name, status, ipAddress, macAddress, operatingSystem, version, owner, vendor, description } =
    req.body || {}

  const existing = await db.collection('ConfigurationItem').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Configuration Item not found' })
  }
  if (status && !STATUSES.includes(status)) {
    return res.status(200).json({ statusCode: 409, message: 'Invalid status' })
  }

  const update = {
    name: name ?? existing.name,
    status: status ?? existing.status,
    ipAddress: ipAddress ?? existing.ipAddress,
    macAddress: macAddress ?? existing.macAddress,
    operatingSystem: operatingSystem ?? existing.operatingSystem,
    version: version ?? existing.version,
    owner: owner ?? existing.owner,
    vendor: vendor ?? existing.vendor,
    description: description ?? existing.description,
    modifyDate: new Date(),
  }

  await db.collection('ConfigurationItem').updateOne({ _id: new ObjectId(id) }, { $set: update })

  return res.status(200).json({ statusCode: 200, message: 'Configuration Item updated successfully' })
}
