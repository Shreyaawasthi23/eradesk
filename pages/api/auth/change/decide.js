import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { logAudit } from '@/lib/auditLog'

// CAB decision: only ROLE_ADMIN or ROLE_MODERATOR (acting as CAB members) may approve/reject —
// mirrors the spec's "only authorized technician/CAB users should be able to approve changes".
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
  const { db, user } = auth
  const { decision, comment } = req.body || {}

  if (!['APPROVED', 'REJECTED'].includes(decision)) {
    return res.status(200).json({ statusCode: 409, message: 'decision must be APPROVED or REJECTED' })
  }

  const existing = await db.collection('Change').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Change not found' })
  }
  if (existing.status !== 'PENDING_APPROVAL') {
    return res
      .status(200)
      .json({ statusCode: 409, message: `Change is not pending approval (currently ${existing.status})` })
  }

  const now = new Date()
  const approvalRecord = {
    approverId: user._id.toString(),
    approverEmail: user.email,
    decision,
    comment: comment || '',
    decidedDate: now,
  }

  await db.collection('Change').updateOne(
    { _id: new ObjectId(id) },
    {
      $push: { approvals: approvalRecord },
      $set: { status: decision, modifyDate: now },
    },
  )

  await logAudit(db, {
    action: 'CAB_DECISION',
    entityType: 'Change',
    entityId: id,
    entityLabel: existing.changeId,
    user,
    req,
    changes: [{ field: 'status', oldValue: existing.status, newValue: decision }],
    reason: comment || '',
  })

  return res.status(200).json({ statusCode: 200, message: `Change ${decision.toLowerCase()} by ${user.email}` })
}
