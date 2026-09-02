import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) {
    return res.status(403).end()
  }

  const { id } = req.query
  const { db } = auth
  const { name, conditions, actions, priority, enabled, continueAfterMatch } = req.body || {}

  const existing = await db.collection('BusinessRule').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Business rule not found' })
  }

  const update = {
    name: name ?? existing.name,
    conditions: conditions ?? existing.conditions,
    actions: actions ?? existing.actions,
    priority: Number.isInteger(priority) ? priority : existing.priority,
    enabled: enabled !== undefined ? enabled : existing.enabled,
    continueAfterMatch: continueAfterMatch !== undefined ? continueAfterMatch : existing.continueAfterMatch,
    modifyDate: new Date(),
  }

  await db.collection('BusinessRule').updateOne({ _id: new ObjectId(id) }, { $set: update })

  return res.status(200).json({ statusCode: 200, message: 'Business rule updated successfully' })
}
