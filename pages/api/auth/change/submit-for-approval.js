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

  const existing = await db.collection('Change').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Change not found' })
  }
  if (!['DRAFT', 'REJECTED'].includes(existing.status)) {
    return res
      .status(200)
      .json({ statusCode: 409, message: `Change must be DRAFT or REJECTED to submit for approval (currently ${existing.status})` })
  }
  if (!existing.implementationPlan || !existing.backoutPlan) {
    return res.status(200).json({
      statusCode: 409,
      message: 'Implementation plan and backout plan are required before CAB submission',
    })
  }

  await db
    .collection('Change')
    .updateOne({ _id: new ObjectId(id) }, { $set: { status: 'PENDING_APPROVAL', modifyDate: new Date() } })

  return res.status(200).json({ statusCode: 200, message: 'Change submitted for CAB approval' })
}
