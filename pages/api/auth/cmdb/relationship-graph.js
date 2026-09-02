import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeConfigurationItem, serializeCIRelationship } from '@/lib/serializers'

// Returns the 1-hop neighborhood (upstream + downstream) around a CI so technicians can see
// impact before performing a change, per spec's relationship-graph requirement.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { id } = req.query
  const { db } = auth

  const ci = await db.collection('ConfigurationItem').findOne({ _id: new ObjectId(id) })
  if (!ci) {
    return res.status(404).json({ statusCode: 404, message: 'Configuration Item not found' })
  }

  const relationships = await db
    .collection('CIRelationship')
    .find({ $or: [{ sourceId: id }, { targetId: id }] })
    .toArray()

  const neighborIds = new Set()
  relationships.forEach((r) => {
    neighborIds.add(r.sourceId === id ? r.targetId : r.sourceId)
  })

  const neighbors = neighborIds.size
    ? await db
        .collection('ConfigurationItem')
        .find({ _id: { $in: [...neighborIds].map((x) => new ObjectId(x)) } })
        .toArray()
    : []

  return res.status(200).json({
    ci: serializeConfigurationItem(ci),
    neighbors: neighbors.map(serializeConfigurationItem),
    relationships: relationships.map(serializeCIRelationship),
  })
}
