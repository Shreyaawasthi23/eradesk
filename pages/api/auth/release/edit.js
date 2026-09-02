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
  const {
    title, description, version, plannedDate, testNotes, rollbackPlan,
    engineerId, workGroup,
  } = req.body || {}

  const existing = await db.collection('Release').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Release not found' })
  }
  if (['DEPLOYED', 'REVIEWED', 'CLOSED', 'ROLLED_BACK', 'CANCELLED'].includes(existing.status)) {
    return res
      .status(200)
      .json({ statusCode: 409, message: `Release cannot be edited while ${existing.status}` })
  }

  const update = {
    title: title ?? existing.title,
    description: description ?? existing.description,
    version: version ?? existing.version,
    plannedDate: plannedDate ? new Date(plannedDate) : existing.plannedDate,
    testNotes: testNotes ?? existing.testNotes,
    rollbackPlan: rollbackPlan ?? existing.rollbackPlan,
    engineerId: engineerId ?? existing.engineerId,
    workGroup: workGroup ?? existing.workGroup,
    modifyDate: new Date(),
  }

  await db.collection('Release').updateOne({ _id: new ObjectId(id) }, { $set: update })

  return res.status(200).json({ statusCode: 200, message: 'Release updated successfully' })
}
