import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'
import { serializeConfigurationItem, serializeAsset, serializeIncident, serializeProblem, serializeChange, serializeCIRelationship } from '@/lib/serializers'
import { toPageResponse } from '@/lib/pagination'

const TYPES = ['SERVER', 'DESKTOP', 'LAPTOP', 'APPLICATION', 'DATABASE', 'VIRTUAL_MACHINE', 'CLOUD_RESOURCE', 'NETWORK_DEVICE', 'OTHER']

async function ciCreate(req, res) {
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

const STATUSES = ['ACTIVE', 'INACTIVE', 'UNDER_MAINTENANCE', 'RETIRED']

async function ciEdit(req, res) {
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

async function getAllPage(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { type, status } = req.query
  const { db } = auth

  const filter = {}
  if (type) filter.type = type
  if (status) filter.status = status

  const totalElements = await db.collection('ConfigurationItem').countDocuments(filter)
  const items = await db
    .collection('ConfigurationItem')
    .find(filter)
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res
    .status(200)
    .json(toPageResponse(items.map(serializeConfigurationItem), totalElements, page, size))
}

async function getDetail(req, res) {
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

  const [asset, linkedIncidents, linkedProblems, linkedChanges] = await Promise.all([
    ci.assetId ? db.collection('Assets').findOne({ _id: new ObjectId(ci.assetId) }) : Promise.resolve(null),
    db.collection('Incident').find({ linkedCIIds: id }).toArray(),
    db.collection('Problem').find({ linkedCIIds: id }).toArray(),
    db.collection('Change').find({ linkedCIIds: id }).toArray(),
  ])

  return res.status(200).json({
    ...serializeConfigurationItem(ci),
    asset: asset ? serializeAsset(asset) : null,
    linkedIncidents: linkedIncidents.map(serializeIncident),
    linkedProblems: linkedProblems.map(serializeProblem),
    linkedChanges: linkedChanges.map(serializeChange),
  })
}

// Links a CI to an Incident/Problem/Change by pushing the CI's id onto that record's
// linkedCIIds array. Kept generic (entityType param) rather than one route per entity,
// mirroring the Release module's link.js pattern.
const ENTITY_CONFIG = {
  incident: { collection: 'Incident', label: 'incident' },
  problem: { collection: 'Problem', label: 'problem' },
  change: { collection: 'Change', label: 'change' },
}

async function linkEntity(req, res) {
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

const RELATIONSHIP_TYPES = ['HOSTS', 'USES', 'DEPENDS_ON', 'CONNECTED_TO', 'RUNS_ON']

async function relationshipCreate(req, res) {
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
  const { sourceId, targetId, relationshipType } = req.body || {}

  if (!sourceId || !targetId || !relationshipType) {
    return res.status(200).json({ statusCode: 409, message: 'sourceId, targetId, and relationshipType are required' })
  }
  if (!RELATIONSHIP_TYPES.includes(relationshipType)) {
    return res.status(200).json({ statusCode: 409, message: 'Invalid relationship type' })
  }
  if (sourceId === targetId) {
    return res.status(200).json({ statusCode: 409, message: 'A CI cannot have a relationship with itself' })
  }

  const [source, target] = await Promise.all([
    db.collection('ConfigurationItem').findOne({ _id: new ObjectId(sourceId) }),
    db.collection('ConfigurationItem').findOne({ _id: new ObjectId(targetId) }),
  ])
  if (!source || !target) {
    return res.status(200).json({ statusCode: 409, message: 'Source or target CI not found' })
  }

  const existing = await db
    .collection('CIRelationship')
    .findOne({ sourceId, targetId, relationshipType })
  if (existing) {
    return res.status(200).json({ statusCode: 409, message: 'This relationship already exists' })
  }

  const now = new Date()
  const result = await db.collection('CIRelationship').insertOne({
    sourceId,
    targetId,
    relationshipType,
    createDate: now,
    userId: user._id.toString(),
    userEmail: user.email,
  })

  return res
    .status(200)
    .json({ statusCode: 200, message: `Linked ${source.name} ${relationshipType} ${target.name}`, id: result.insertedId.toString() })
}

async function relationshipDelete(req, res) {
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

  const result = await db.collection('CIRelationship').deleteOne({ _id: new ObjectId(id) })
  if (!result.deletedCount) {
    return res.status(200).json({ statusCode: 409, message: 'Relationship not found' })
  }

  return res.status(200).json({ statusCode: 200, message: 'Relationship removed' })
}

// Returns the 1-hop neighborhood (upstream + downstream) around a CI so technicians can see
// impact before performing a change, per spec's relationship-graph requirement.
async function relationshipGraph(req, res) {
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

async function search(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { db } = auth
  const q = (req.query.q || '').trim()
  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10

  if (!q) {
    return res.status(200).json(toPageResponse([], 0, page, size))
  }

  const pattern = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  const filter = {
    $or: [{ ciId: pattern }, { name: pattern }, { ipAddress: pattern }, { owner: pattern }, { description: pattern }],
  }

  const totalElements = await db.collection('ConfigurationItem').countDocuments(filter)
  const items = await db
    .collection('ConfigurationItem')
    .find(filter)
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res
    .status(200)
    .json(toPageResponse(items.map(serializeConfigurationItem), totalElements, page, size))
}

export default {
  'ci-create': ciCreate,
  'ci-edit': ciEdit,
  'get-all-page': getAllPage,
  'get-detail': getDetail,
  'link-entity': linkEntity,
  'relationship-create': relationshipCreate,
  'relationship-delete': relationshipDelete,
  'relationship-graph': relationshipGraph,
  'search': search,
}
