import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'

const FIELD_TYPES = ['TEXT', 'NUMBER', 'EMAIL', 'PHONE', 'DATE', 'DROPDOWN', 'MULTISELECT', 'CHECKBOX', 'RICH_TEXT']

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
