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
  const { title, description, triggerDelayHours, active } = req.body || {}

  const existing = await db.collection('SurveyTemplate').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Survey template not found' })
  }

  const update = {
    title: title ?? existing.title,
    description: description ?? existing.description,
    triggerDelayHours: triggerDelayHours != null ? Number(triggerDelayHours) : existing.triggerDelayHours,
    active: active !== undefined ? active : existing.active,
    modifyDate: new Date(),
  }

  await db.collection('SurveyTemplate').updateOne({ _id: new ObjectId(id) }, { $set: update })

  return res.status(200).json({ statusCode: 200, message: 'Survey template updated successfully' })
}
