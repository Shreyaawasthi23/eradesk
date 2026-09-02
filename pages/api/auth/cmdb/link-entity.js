import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

// Links a CI to an Incident/Problem/Change by pushing the CI's id onto that record's
// linkedCIIds array. Kept generic (entityType param) rather than one route per entity,
// mirroring the Release module's link.js pattern.
const ENTITY_CONFIG = {
  incident: { collection: 'Incident', label: 'incident' },
  problem: { collection: 'Problem', label: 'problem' },
  change: { collection: 'Change', label: 'change' },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { id } = req.query
  const { db } = auth
  const { entityType, entityId } = req.body || {}

  const config = ENTITY_CONFIG[entityType]
  if (!config || !entityId) {
    return res.status(200).json({ statusCode: 409, message: 'entityType must be incident, problem, or change, and entityId is required' })
  }

  const ci = await db.collection('ConfigurationItem').findOne({ _id: new ObjectId(id) })
  if (!ci) {
    return res.status(200).json({ statusCode: 409, message: 'Configuration Item not found' })
  }

  const entity = await db.collection(config.collection).findOne({ _id: new ObjectId(entityId) })
  if (!entity) {
    return res.status(200).json({ statusCode: 409, message: `${config.label} not found` })
  }

  if ((entity.linkedCIIds || []).includes(id)) {
    return res.status(200).json({ statusCode: 409, message: `This ${config.label} is already linked to the CI` })
  }

  await db
    .collection(config.collection)
    .updateOne({ _id: new ObjectId(entityId) }, { $addToSet: { linkedCIIds: id }, $set: { modifyDate: new Date() } })

  return res.status(200).json({ statusCode: 200, message: `Linked ${config.label} to ${ci.name}` })
}
