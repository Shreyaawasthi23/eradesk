import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { id } = req.query
  const { db } = auth
  const { name, description, active, slaHours, assignmentGroup, cost } = req.body || {}

  const existing = await db.collection('ServiceCatalogItem').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Catalog item not found' })
  }

  const update = {
    name: name ?? existing.name,
    description: description ?? existing.description,
    active: active !== undefined ? active : existing.active,
    slaHours: slaHours != null ? Number(slaHours) : existing.slaHours,
    assignmentGroup: assignmentGroup ?? existing.assignmentGroup,
    cost: cost != null ? Number(cost) : existing.cost,
    modifyDate: new Date(),
  }

  await db.collection('ServiceCatalogItem').updateOne({ _id: new ObjectId(id) }, { $set: update })

  return res.status(200).json({ statusCode: 200, message: 'Catalog item updated successfully' })
}
