import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

const ENTITY_CONFIG = {
  change: { collection: 'Change', field: 'linkedChangeIds', label: 'change' },
  problem: { collection: 'Problem', field: 'linkedProblemIds', label: 'problem' },
  incident: { collection: 'Incident', field: 'linkedIncidentIds', label: 'incident' },
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
    return res.status(200).json({ statusCode: 409, message: 'entityType must be change, problem, or incident, and entityId is required' })
  }

  const release = await db.collection('Release').findOne({ _id: new ObjectId(id) })
  if (!release) {
    return res.status(200).json({ statusCode: 409, message: 'Release not found' })
  }

  const entity = await db.collection(config.collection).findOne({ _id: new ObjectId(entityId) })
  if (!entity) {
    return res.status(200).json({ statusCode: 409, message: `${config.label} not found` })
  }

  if ((release[config.field] || []).includes(entityId)) {
    return res.status(200).json({ statusCode: 409, message: `This ${config.label} is already linked to the release` })
  }

  await db
    .collection('Release')
    .updateOne({ _id: new ObjectId(id) }, { $addToSet: { [config.field]: entityId }, $set: { modifyDate: new Date() } })

  return res.status(200).json({ statusCode: 200, message: `Linked ${config.label}` })
}
