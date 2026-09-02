import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeContract, serializeVendor, serializeAsset } from '@/lib/serializers'

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
