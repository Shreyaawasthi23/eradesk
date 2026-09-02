import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'

const TYPES = ['AMC', 'WARRANTY', 'SERVICE', 'LICENSE', 'LEASE', 'OTHER']

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
