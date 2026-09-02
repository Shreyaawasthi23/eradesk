import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'
import { notifyUsers } from '@/lib/notify'

const MODES = ['SINGLE', 'SEQUENTIAL', 'PARALLEL']

// Generic approval engine: any module (Purchase Orders today, more later) creates a request
// naming its entity + a list of approver user ids. SEQUENTIAL activates approvers one at a time
// in order; PARALLEL and SINGLE activate all named approvers immediately (SINGLE simply expects
// only one approver in the list).
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
