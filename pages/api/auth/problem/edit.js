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
  const { title, description, priority, symptoms, rootCause, workaround, permanentSolution, engineerId, workGroup } =
    req.body || {}

  const existing = await db.collection('Problem').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Problem not found' })
  }

  const update = {
    title: title ?? existing.title,
    description: description ?? existing.description,
    priority: priority ?? existing.priority,
    symptoms: symptoms ?? existing.symptoms,
    rootCause: rootCause ?? existing.rootCause,
    workaround: workaround ?? existing.workaround,
    permanentSolution: permanentSolution ?? existing.permanentSolution,
    engineerId: engineerId ?? existing.engineerId,
    workGroup: workGroup ?? existing.workGroup,
    modifyDate: new Date(),
  }

  await db.collection('Problem').updateOne({ _id: new ObjectId(id) }, { $set: update })

  return res.status(200).json({ statusCode: 200, message: 'Problem updated successfully' })
}
