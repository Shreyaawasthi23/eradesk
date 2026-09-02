import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'
import { ObjectId } from 'mongodb'
import { serializeCatalogItem, serializeServiceRequest } from '@/lib/serializers'
import { toPageResponse } from '@/lib/pagination'
import { notifyUsers } from '@/lib/notify'

const FIELD_TYPES = ['TEXT', 'NUMBER', 'EMAIL', 'PHONE', 'DATE', 'DROPDOWN', 'MULTISELECT', 'CHECKBOX', 'RICH_TEXT']

async function create(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { db, user } = auth
  const { name, description, category, formFields, approvalRequired, approverIds, slaHours, assignmentGroup, cost } =
    req.body || {}

  if (!name) {
    return res.status(200).json({ statusCode: 409, message: 'Name is required' })
  }
  for (const f of formFields || []) {
    if (!f.label || !FIELD_TYPES.includes(f.type)) {
      return res.status(200).json({ statusCode: 409, message: 'Each form field needs a label and a valid type' })
    }
    if (['DROPDOWN', 'MULTISELECT'].includes(f.type) && (!Array.isArray(f.options) || f.options.length === 0)) {
      return res.status(200).json({ statusCode: 409, message: `${f.type} fields need at least one option` })
    }
  }
  if (approvalRequired && (!Array.isArray(approverIds) || approverIds.length === 0)) {
    return res.status(200).json({ statusCode: 409, message: 'approverIds are required when approvalRequired is true' })
  }

  const seq = await nextSequence(db, 'CatalogItemSequence', 'catalog_item_sequence')
  const itemId = `SVC-${String(seq).padStart(6, '0')}`
  const now = new Date()

  const newItem = {
    itemId,
    name,
    description: description || '',
    category: category || 'General',
    formFields: (formFields || []).map((f) => ({
      id: f.id || `${f.label}`.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      label: f.label,
      type: f.type,
      required: !!f.required,
      options: ['DROPDOWN', 'MULTISELECT'].includes(f.type) ? f.options : [],
    })),
    approvalRequired: !!approvalRequired,
    approverIds: approvalRequired ? approverIds : [],
    slaHours: Number(slaHours) || 24,
    assignmentGroup: assignmentGroup || '',
    cost: cost != null ? Number(cost) : null,
    active: true,
    createDate: now,
    modifyDate: now,
    userId: user._id.toString(),
    userEmail: user.email,
  }

  const result = await db.collection('ServiceCatalogItem').insertOne(newItem)

  return res
    .status(200)
    .json({ statusCode: 200, message: `Catalog item created ${itemId}`, id: result.insertedId.toString() })
}

async function edit(req, res) {
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
  const { name, description, active, slaHours, assignmentGroup, cost } = req.body || {}

  const existing = await db.collection('ServiceCatalogItem').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Catalog item not found' })
  }

  const update = {
    name: name ?? existing.name,
    description: description ?? existing.description,
    active: active !== undefined ? active : existing.active,
    slaHours: slaHours != null ? Number(slaHours) : existing.slaHours,
    assignmentGroup: assignmentGroup ?? existing.assignmentGroup,
    cost: cost != null ? Number(cost) : existing.cost,
    modifyDate: new Date(),
  }

  await db.collection('ServiceCatalogItem').updateOne({ _id: new ObjectId(id) }, { $set: update })

  return res.status(200).json({ statusCode: 200, message: 'Catalog item updated successfully' })
}

async function getAllPage(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { activeOnly, category } = req.query
  const { db } = auth

  const filter = {}
  if (activeOnly === 'true') filter.active = true
  if (category) filter.category = category

  const totalElements = await db.collection('ServiceCatalogItem').countDocuments(filter)
  const items = await db
    .collection('ServiceCatalogItem')
    .find(filter)
    .sort({ category: 1, name: 1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeCatalogItem), totalElements, page, size))
}

async function getDetail(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { id } = req.query
  const { db } = auth

  const item = await db.collection('ServiceCatalogItem').findOne({ _id: new ObjectId(id) })
  if (!item) {
    return res.status(404).json({ statusCode: 404, message: 'Catalog item not found' })
  }

  return res.status(200).json(serializeCatalogItem(item))
}

async function requestGetAllPage(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { status, mine } = req.query
  const { db, user } = auth

  const filter = {}
  if (status) filter.status = status
  if (mine === 'true') filter.requesterId = user._id.toString()

  const totalElements = await db.collection('ServiceRequest').countDocuments(filter)
  const items = await db
    .collection('ServiceRequest')
    .find(filter)
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeServiceRequest), totalElements, page, size))
}

async function requestGetDetail(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { id } = req.query
  const { db } = auth

  const request = await db.collection('ServiceRequest').findOne({ _id: new ObjectId(id) })
  if (!request) {
    return res.status(404).json({ statusCode: 404, message: 'Service request not found' })
  }

  return res.status(200).json(serializeServiceRequest(request))
}

const STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED']

const ALLOWED_TRANSITIONS = {
  PENDING_APPROVAL: ['CANCELLED'],
  OPEN: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['RESOLVED', 'CANCELLED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
  REJECTED: [],
  CANCELLED: [],
}

async function requestSetStatus(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { id } = req.query
  const { db } = auth
  const { status, closureNotes } = req.body || {}

  if (!STATUSES.includes(status) && status !== 'CANCELLED') {
    return res.status(200).json({ statusCode: 409, message: 'Invalid status' })
  }

  const existing = await db.collection('ServiceRequest').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Service request not found' })
  }

  if (!ALLOWED_TRANSITIONS[existing.status]?.includes(status)) {
    return res.status(200).json({
      statusCode: 409,
      message: `Cannot move service request from ${existing.status} to ${status}`,
    })
  }
  if (status === 'CLOSED' && !(closureNotes || existing.closureNotes)) {
    return res.status(200).json({ statusCode: 409, message: 'Closure notes are required to close a service request' })
  }

  const now = new Date()
  const update = { status, modifyDate: now }
  if (closureNotes) update.closureNotes = closureNotes
  if (status === 'CLOSED') update.closeDate = now

  await db.collection('ServiceRequest').updateOne({ _id: new ObjectId(id) }, { $set: update })

  return res.status(200).json({ statusCode: 200, message: `Service request marked ${status}` })
}

// Validates submitted formData against the catalog item's field definitions (required fields
// present, DROPDOWN/MULTISELECT values within the configured options), creates a ServiceRequest,
// and — if the item requires approval — creates the matching ApprovalRequest directly (same
// collection/shape the generic approval engine's own /request endpoint writes, so the two stay
// interoperable) and leaves the service request PENDING_APPROVAL until it resolves.
async function submitRequest(req, res) {
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

export default {
  'create': create,
  'edit': edit,
  'get-all-page': getAllPage,
  'get-detail': getDetail,
  'request-get-all-page': requestGetAllPage,
  'request-get-detail': requestGetDetail,
  'request-set-status': requestSetStatus,
  'submit-request': submitRequest,
}
