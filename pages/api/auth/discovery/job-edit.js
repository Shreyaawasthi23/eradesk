import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

const STATUSES = ['ACTIVE', 'PAUSED']

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
  const { name, schedule, status } = req.body || {}

  const existing = await db.collection('DiscoveryJob').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Discovery job not found' })
  }
  if (status && !STATUSES.includes(status)) {
    return res.status(200).json({ statusCode: 409, message: 'Invalid status' })
  }

  const update = {
    name: name ?? existing.name,
    schedule: schedule ?? existing.schedule,
    status: status ?? existing.status,
    modifyDate: new Date(),
  }

  await db.collection('DiscoveryJob').updateOne({ _id: new ObjectId(id) }, { $set: update })

  return res.status(200).json({ statusCode: 200, message: 'Discovery job updated successfully' })
}
