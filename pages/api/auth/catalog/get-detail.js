import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeCatalogItem } from '@/lib/serializers'

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

  const item = await db.collection('ServiceCatalogItem').findOne({ _id: new ObjectId(id) })
  if (!item) {
    return res.status(404).json({ statusCode: 404, message: 'Catalog item not found' })
  }

  return res.status(200).json(serializeCatalogItem(item))
}
