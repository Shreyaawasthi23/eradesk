import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'
import { serializeContract, serializeVendor, serializeAsset } from '@/lib/serializers'
import { toPageResponse } from '@/lib/pagination'
import { logAudit } from '@/lib/auditLog'

const TYPES = ['AMC', 'WARRANTY', 'SERVICE', 'LICENSE', 'LEASE', 'OTHER']

async function create(req, res) {
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
  const { vendorId, type, description, startDate, endDate, renewalDate, cost, linkedAssetIds } = req.body || {}

  if (!vendorId || !startDate || !endDate) {
    return res.status(200).json({ statusCode: 409, message: 'vendorId, startDate, and endDate are required' })
  }
  if (type && !TYPES.includes(type)) {
    return res.status(200).json({ statusCode: 409, message: 'Invalid contract type' })
  }
  if (new Date(endDate) <= new Date(startDate)) {
    return res.status(200).json({ statusCode: 409, message: 'endDate must be after startDate' })
  }

  const vendor = await db.collection('Vendor').findOne({ _id: new ObjectId(vendorId) })
  if (!vendor) {
    return res.status(200).json({ statusCode: 409, message: 'Vendor not found' })
  }

  const assetIds = Array.isArray(linkedAssetIds) ? linkedAssetIds : []
  if (assetIds.length) {
    const found = await db
      .collection('Assets')
      .countDocuments({ _id: { $in: assetIds.map((id) => new ObjectId(id)) } })
    if (found !== assetIds.length) {
      return res.status(200).json({ statusCode: 409, message: 'One or more linked assets were not found' })
    }
  }

  const seq = await nextSequence(db, 'ContractSequence', 'contract_sequence')
  const contractId = `CON-${String(seq).padStart(6, '0')}`
  const now = new Date()

  const newContract = {
    contractId,
    vendorId,
    vendorName: vendor.name,
    type: type || 'OTHER',
    description: description || '',
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    renewalDate: renewalDate ? new Date(renewalDate) : null,
    cost: cost != null ? Number(cost) : null,
    status: 'ACTIVE',
    linkedAssetIds: assetIds,
    createDate: now,
    modifyDate: now,
    userId: user._id.toString(),
    userEmail: user.email,
  }

  const result = await db.collection('Contract').insertOne(newContract)

  return res
    .status(200)
    .json({ statusCode: 200, message: `Contract created ${contractId}`, id: result.insertedId.toString() })
}

async function edit(req, res) {
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
  const { description, endDate, renewalDate, cost } = req.body || {}

  const existing = await db.collection('Contract').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Contract not found' })
  }

  const nextEndDate = endDate ? new Date(endDate) : existing.endDate
  if (nextEndDate <= existing.startDate) {
    return res.status(200).json({ statusCode: 409, message: 'endDate must be after startDate' })
  }

  const update = {
    description: description ?? existing.description,
    endDate: nextEndDate,
    renewalDate: renewalDate ? new Date(renewalDate) : existing.renewalDate,
    cost: cost != null ? Number(cost) : existing.cost,
    modifyDate: new Date(),
  }

  await db.collection('Contract').updateOne({ _id: new ObjectId(id) }, { $set: update })

  return res.status(200).json({ statusCode: 200, message: 'Contract updated successfully' })
}

async function expiringContracts(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { db } = auth
  const days = Number(req.query.days) || 30
  const now = new Date()
  const threshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  const contracts = await db
    .collection('Contract')
    .find({ status: 'ACTIVE', endDate: { $lte: threshold } })
    .sort({ endDate: 1 })
    .toArray()

  return res.status(200).json(contracts.map(serializeContract))
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
  const { status, type } = req.query
  const { db } = auth

  const filter = {}
  if (status) filter.status = status
  if (type) filter.type = type

  const totalElements = await db.collection('Contract').countDocuments(filter)
  const items = await db
    .collection('Contract')
    .find(filter)
    .sort({ endDate: 1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeContract), totalElements, page, size))
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

  const contract = await db.collection('Contract').findOne({ _id: new ObjectId(id) })
  if (!contract) {
    return res.status(404).json({ statusCode: 404, message: 'Contract not found' })
  }

  const [vendor, assets] = await Promise.all([
    db.collection('Vendor').findOne({ _id: new ObjectId(contract.vendorId) }),
    contract.linkedAssetIds?.length
      ? db.collection('Assets').find({ _id: { $in: contract.linkedAssetIds.map((x) => new ObjectId(x)) } }).toArray()
      : Promise.resolve([]),
  ])

  return res.status(200).json({
    ...serializeContract(contract),
    vendor: vendor ? serializeVendor(vendor) : null,
    linkedAssets: assets.map(serializeAsset),
  })
}

const STATUSES = ['ACTIVE', 'RENEWED', 'EXPIRED', 'TERMINATED']

async function setStatus(req, res) {
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
  const { status } = req.body || {}

  if (!STATUSES.includes(status)) {
    return res.status(200).json({ statusCode: 409, message: 'Invalid status' })
  }

  const existing = await db.collection('Contract').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Contract not found' })
  }
  if (['EXPIRED', 'TERMINATED'].includes(existing.status)) {
    return res.status(200).json({ statusCode: 409, message: `Contract is already ${existing.status}` })
  }

  await db
    .collection('Contract')
    .updateOne({ _id: new ObjectId(id) }, { $set: { status, modifyDate: new Date() } })

  await logAudit(db, {
    action: 'STATUS_CHANGE',
    entityType: 'Contract',
    entityId: id,
    entityLabel: existing.contractId,
    user,
    req,
    changes: [{ field: 'status', oldValue: existing.status, newValue: status }],
  })

  return res.status(200).json({ statusCode: 200, message: `Contract marked ${status}` })
}

export default {
  'create': create,
  'edit': edit,
  'expiring-contracts': expiringContracts,
  'get-all-page': getAllPage,
  'get-detail': getDetail,
  'set-status': setStatus,
}
