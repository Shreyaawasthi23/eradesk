import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeAsset } from '@/lib/serializers'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER'])) return res.status(403).end()

  const { serialNo } = req.query
  const { db } = auth
  const asset = await db.collection('Assets').findOne({ serialNumber: serialNo })
  if (!asset) return res.status(200).json(null)

  const endClient = asset.endClientId
    ? await db.collection('EndClient').findOne({ _id: new ObjectId(asset.endClientId) })
    : null
  const frontClient = asset.frontClientId
    ? await db.collection('FrontClient').findOne({ _id: new ObjectId(asset.frontClientId) })
    : null

  return res.status(200).json({
    assets: serializeAsset(asset),
    endClient: endClient ? endClient.name : null,
    frontClient: frontClient ? frontClient.name : null,
  })
}
