import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'
import { notifyUsers } from '@/lib/notify'

// Validates submitted formData against the catalog item's field definitions (required fields
// present, DROPDOWN/MULTISELECT values within the configured options), creates a ServiceRequest,
// and — if the item requires approval — creates the matching ApprovalRequest directly (same
// collection/shape the generic approval engine's own /request endpoint writes, so the two stay
// interoperable) and leaves the service request PENDING_APPROVAL until it resolves.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { db, user } = auth
  const { catalogItemId, formData } = req.body || {}

  if (!catalogItemId) {
    return res.status(200).json({ statusCode: 409, message: 'catalogItemId is required' })
  }

  const item = await db.collection('ServiceCatalogItem').findOne({ _id: new ObjectId(catalogItemId) })
  if (!item || !item.active) {
    return res.status(200).json({ statusCode: 409, message: 'Catalog item not found or inactive' })
  }

  const submitted = formData || {}
  for (const field of item.formFields) {
    const value = submitted[field.id]
    if (field.required && (value === undefined || value === null || value === '')) {
      return res.status(200).json({ statusCode: 409, message: `"${field.label}" is required` })
    }
    if (field.type === 'DROPDOWN' && value !== undefined && value !== '' && !field.options.includes(value)) {
      return res.status(200).json({ statusCode: 409, message: `"${field.label}" has an invalid value` })
    }
    if (field.type === 'MULTISELECT' && Array.isArray(value)) {
      const invalid = value.filter((v) => !field.options.includes(v))
      if (invalid.length) {
        return res.status(200).json({ statusCode: 409, message: `"${field.label}" has invalid option(s): ${invalid.join(', ')}` })
      }
    }
  }

  const seq = await nextSequence(db, 'ServiceRequestSequence', 'service_request_sequence')
  const requestId = `REQ-${String(seq).padStart(6, '0')}`
  const now = new Date()

  const newRequest = {
    requestId,
    catalogItemId,
    catalogItemName: item.name,
    formData: submitted,
    status: item.approvalRequired ? 'PENDING_APPROVAL' : 'OPEN',
    approvalRequestId: null,
    assignmentGroup: item.assignmentGroup,
    engineerId: null,
    requesterId: user._id.toString(),
    requesterEmail: user.email,
    closureNotes: '',
    createDate: now,
    modifyDate: now,
    closeDate: null,
  }

  const result = await db.collection('ServiceRequest').insertOne(newRequest)

  if (item.approvalRequired) {
    const approvalSeq = await nextSequence(db, 'ApprovalSequence', 'approval_sequence')
    const approvalId = `APR-${String(approvalSeq).padStart(6, '0')}`
    const approvers = await db
      .collection('Users')
      .find({ _id: { $in: item.approverIds.map((id) => new ObjectId(id)) } })
      .toArray()
    const emailById = new Map(approvers.map((a) => [a._id.toString(), a.email]))

    const steps = item.approverIds.map((approverId, idx) => ({
      order: idx + 1,
      approverId,
      approverEmail: emailById.get(approverId),
      status: idx === 0 ? 'PENDING' : 'WAITING',
      comment: '',
      decidedDate: null,
    }))

    const approvalResult = await db.collection('ApprovalRequest').insertOne({
      approvalId,
      entityType: 'SERVICE_REQUEST',
      entityId: result.insertedId.toString(),
      entityLabel: `${item.name} (${requestId})`,
      mode: 'SEQUENTIAL',
      status: 'PENDING',
      steps,
      requestedById: user._id.toString(),
      requestedByEmail: user.email,
      createDate: now,
      modifyDate: now,
    })

    await db
      .collection('ServiceRequest')
      .updateOne({ _id: result.insertedId }, { $set: { approvalRequestId: approvalResult.insertedId.toString() } })

    const firstStepApprovers = steps.filter((s) => s.status === 'PENDING').map((s) => s.approverId)
    await notifyUsers(db, firstStepApprovers, {
      type: 'APPROVAL_REQUEST',
      title: `Approval requested: ${approvalId}`,
      message: `${item.name} (${requestId})`,
      link: '/approvals',
    })
  }

  return res.status(200).json({
    statusCode: 200,
    message: `Service request submitted ${requestId}`,
    id: result.insertedId.toString(),
  })
}
