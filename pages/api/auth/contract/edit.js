import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

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
