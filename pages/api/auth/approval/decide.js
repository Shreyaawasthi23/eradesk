import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { logAudit } from '@/lib/auditLog'
import { notifyUser } from '@/lib/notify'

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
  const { decision, comment } = req.body || {}

  if (!['APPROVED', 'REJECTED'].includes(decision)) {
    return res.status(200).json({ statusCode: 409, message: 'decision must be APPROVED or REJECTED' })
  }

  const request = await db.collection('ApprovalRequest').findOne({ _id: new ObjectId(id) })
  if (!request) {
    return res.status(200).json({ statusCode: 409, message: 'Approval request not found' })
  }
  if (request.status !== 'PENDING') {
    return res.status(200).json({ statusCode: 409, message: `Request is not pending (currently ${request.status})` })
  }

  const myStep = request.steps.find(
    (s) => s.approverId === user._id.toString() && s.status === 'PENDING',
  )
  if (!myStep) {
    return res.status(200).json({
      statusCode: 409,
      message: 'You have no pending approval step on this request',
    })
  }

  const now = new Date()
  const steps = request.steps.map((s) =>
    s.order === myStep.order
      ? { ...s, status: decision, comment: comment || '', decidedDate: now }
      : s,
  )

  let overallStatus = 'PENDING'

  if (decision === 'REJECTED') {
    // A single rejection ends the whole request regardless of mode — remaining steps are
    // moot once one approver has said no.
    overallStatus = 'REJECTED'
    steps.forEach((s) => {
      if (s.status === 'PENDING' || s.status === 'WAITING') s.status = 'CANCELLED'
    })
  } else if (request.mode === 'SEQUENTIAL') {
    const next = steps.find((s) => s.order === myStep.order + 1)
    if (next) {
      next.status = 'PENDING'
      overallStatus = 'PENDING'
    } else {
      overallStatus = 'APPROVED'
    }
  } else {
    // SINGLE or PARALLEL: overall approval requires every step to be APPROVED.
    overallStatus = steps.every((s) => s.status === 'APPROVED') ? 'APPROVED' : 'PENDING'
  }

  await db.collection('ApprovalRequest').updateOne(
    { _id: new ObjectId(id) },
    { $set: { steps, status: overallStatus, modifyDate: now } },
  )

  // Cross-module effect: a service request submitted with approvalRequired=true sits in
  // PENDING_APPROVAL until this approval resolves — release it to OPEN or REJECTED accordingly.
  if (request.entityType === 'SERVICE_REQUEST' && (overallStatus === 'APPROVED' || overallStatus === 'REJECTED')) {
    await db.collection('ServiceRequest').updateOne(
      { _id: new ObjectId(request.entityId) },
      { $set: { status: overallStatus === 'APPROVED' ? 'OPEN' : 'REJECTED', modifyDate: now } },
    )
  }

  if (overallStatus === 'PENDING' && request.mode === 'SEQUENTIAL') {
    const next = steps.find((s) => s.order === myStep.order + 1 && s.status === 'PENDING')
    if (next) {
      await notifyUser(db, {
        userId: next.approverId,
        type: 'APPROVAL_REQUEST',
        title: `Approval requested: ${request.approvalId}`,
        message: request.entityLabel || `${request.entityType} approval needed`,
        link: '/approvals',
      })
    }
  } else if (overallStatus === 'APPROVED' || overallStatus === 'REJECTED') {
    await notifyUser(db, {
      userId: request.requestedById,
      type: 'APPROVAL_DECISION',
      title: `${request.approvalId} ${overallStatus.toLowerCase()}`,
      message: request.entityLabel || request.entityType,
      link: '/approvals',
    })
  }

  await logAudit(db, {
    action: 'APPROVAL_DECISION',
    entityType: 'ApprovalRequest',
    entityId: id,
    entityLabel: `${request.approvalId} (${request.entityType})`,
    user,
    req,
    changes: [{ field: 'status', oldValue: request.status, newValue: overallStatus }],
    reason: comment || '',
  })

  return res.status(200).json({ statusCode: 200, message: `Step ${decision.toLowerCase()}`, overallStatus })
}
