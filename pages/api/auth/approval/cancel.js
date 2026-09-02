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
  const { db, user } = auth

  const request = await db.collection('ApprovalRequest').findOne({ _id: new ObjectId(id) })
  if (!request) {
    return res.status(200).json({ statusCode: 409, message: 'Approval request not found' })
  }
  if (request.status !== 'PENDING') {
    return res.status(200).json({ statusCode: 409, message: `Request is not pending (currently ${request.status})` })
  }
  const isRequester = request.requestedById === user._id.toString()
  const isAdmin = auth.roles.includes('ROLE_ADMIN')
  if (!isRequester && !isAdmin) {
    return res.status(200).json({ statusCode: 409, message: 'Only the requester or an admin can cancel this request' })
  }

  const steps = request.steps.map((s) =>
    s.status === 'PENDING' || s.status === 'WAITING' ? { ...s, status: 'CANCELLED' } : s,
  )

  await db.collection('ApprovalRequest').updateOne(
    { _id: new ObjectId(id) },
    { $set: { steps, status: 'CANCELLED', modifyDate: new Date() } },
  )

  return res.status(200).json({ statusCode: 200, message: 'Approval request cancelled' })
}
