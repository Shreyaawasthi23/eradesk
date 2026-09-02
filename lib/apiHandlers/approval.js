import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { logAudit } from '@/lib/auditLog'
import { notifyUser, notifyUsers } from '@/lib/notify'
import { serializeApprovalRequest } from '@/lib/serializers'
import { toPageResponse } from '@/lib/pagination'
import { nextSequence } from '@/lib/sequence'

async function cancel(req, res) {
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

async function decide(req, res) {
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

async function getAllPage(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { status, entityType } = req.query
  const { db } = auth

  const filter = {}
  if (status) filter.status = status
  if (entityType) filter.entityType = entityType

  const totalElements = await db.collection('ApprovalRequest').countDocuments(filter)
  const items = await db
    .collection('ApprovalRequest')
    .find(filter)
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeApprovalRequest), totalElements, page, size))
}

async function getDetail(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { id } = req.query
  const { db } = auth

  const request = await db.collection('ApprovalRequest').findOne({ _id: new ObjectId(id) })
  if (!request) {
    return res.status(404).json({ statusCode: 404, message: 'Approval request not found' })
  }

  return res.status(200).json(serializeApprovalRequest(request))
}

async function getForEntity(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { entityType, entityId } = req.query
  if (!entityType || !entityId) {
    return res.status(200).json({ statusCode: 409, message: 'entityType and entityId are required' })
  }

  const { db } = auth
  const requests = await db
    .collection('ApprovalRequest')
    .find({ entityType, entityId })
    .sort({ createDate: -1 })
    .toArray()

  return res.status(200).json(requests.map(serializeApprovalRequest))
}

// "My pending approvals" — used for a technician/manager dashboard widget.
async function getPendingForMe(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { db, user } = auth
  const requests = await db
    .collection('ApprovalRequest')
    .find({
      status: 'PENDING',
      steps: { $elemMatch: { approverId: user._id.toString(), status: 'PENDING' } },
    })
    .sort({ createDate: -1 })
    .toArray()

  return res.status(200).json(requests.map(serializeApprovalRequest))
}

const MODES = ['SINGLE', 'SEQUENTIAL', 'PARALLEL']

// Generic approval engine: any module (Purchase Orders today, more later) creates a request
// naming its entity + a list of approver user ids. SEQUENTIAL activates approvers one at a time
// in order; PARALLEL and SINGLE activate all named approvers immediately (SINGLE simply expects
// only one approver in the list).
async function request(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { db, user } = auth
  const { entityType, entityId, entityLabel, mode, approverIds } = req.body || {}

  if (!entityType || !entityId || !Array.isArray(approverIds) || approverIds.length === 0) {
    return res.status(200).json({
      statusCode: 409,
      message: 'entityType, entityId, and a non-empty approverIds array are required',
    })
  }
  const resolvedMode = mode || 'SEQUENTIAL'
  if (!MODES.includes(resolvedMode)) {
    return res.status(200).json({ statusCode: 409, message: 'Invalid mode' })
  }
  if (resolvedMode === 'SINGLE' && approverIds.length !== 1) {
    return res.status(200).json({ statusCode: 409, message: 'SINGLE mode requires exactly one approver' })
  }

  const existingPending = await db
    .collection('ApprovalRequest')
    .findOne({ entityType, entityId, status: 'PENDING' })
  if (existingPending) {
    return res.status(200).json({ statusCode: 409, message: 'An approval is already pending for this entity' })
  }

  const approvers = await db
    .collection('Users')
    .find({ _id: { $in: approverIds.map((id) => new ObjectId(id)) } })
    .toArray()
  if (approvers.length !== approverIds.length) {
    return res.status(200).json({ statusCode: 409, message: 'One or more approvers were not found' })
  }
  const emailById = new Map(approvers.map((a) => [a._id.toString(), a.email]))

  const seq = await nextSequence(db, 'ApprovalSequence', 'approval_sequence')
  const approvalId = `APR-${String(seq).padStart(6, '0')}`
  const now = new Date()

  const steps = approverIds.map((approverId, idx) => ({
    order: idx + 1,
    approverId,
    approverEmail: emailById.get(approverId),
    // Only the first step is immediately actionable in SEQUENTIAL mode; the rest wait their turn.
    status: resolvedMode === 'SEQUENTIAL' && idx > 0 ? 'WAITING' : 'PENDING',
    comment: '',
    decidedDate: null,
  }))

  const newRequest = {
    approvalId,
    entityType,
    entityId,
    entityLabel: entityLabel || '',
    mode: resolvedMode,
    status: 'PENDING',
    steps,
    requestedById: user._id.toString(),
    requestedByEmail: user.email,
    createDate: now,
    modifyDate: now,
  }

  const result = await db.collection('ApprovalRequest').insertOne(newRequest)

  const actionableApproverIds = steps.filter((s) => s.status === 'PENDING').map((s) => s.approverId)
  await notifyUsers(db, actionableApproverIds, {
    type: 'APPROVAL_REQUEST',
    title: `Approval requested: ${approvalId}`,
    message: entityLabel || `${entityType} approval needed`,
    link: '/approvals',
  })

  return res
    .status(200)
    .json({ statusCode: 200, message: `Approval requested ${approvalId}`, id: result.insertedId.toString() })
}

export default {
  'cancel': cancel,
  'decide': decide,
  'get-all-page': getAllPage,
  'get-detail': getDetail,
  'get-for-entity': getForEntity,
  'get-pending-for-me': getPendingForMe,
  'request': request,
}
