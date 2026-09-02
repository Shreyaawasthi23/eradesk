import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeAuditLog } from '@/lib/serializers'
import { toPageResponse } from '@/lib/pagination'

async function getAllPage(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) {
    return res.status(403).end()
  }

  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 20
  const { entityType, action, userEmail } = req.query
  const { db } = auth

  const filter = {}
  if (entityType) filter.entityType = entityType
  if (action) filter.action = action
  if (userEmail) filter.userEmail = new RegExp(userEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

  const totalElements = await db.collection('AuditLog').countDocuments(filter)
  const items = await db
    .collection('AuditLog')
    .find(filter)
    .sort({ timestamp: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeAuditLog), totalElements, page, size))
}

// Entity-scoped audit trail, used to render "Audit History" on a record's detail page
// (per spec section 98's UX rule that every major entity gets an Audit History tab).
async function getForEntity(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { entityType, entityId } = req.query
  if (!entityType || !entityId) {
    return res.status(200).json({ statusCode: 409, message: 'entityType and entityId are required' })
  }

  const { db } = auth
  const logs = await db
    .collection('AuditLog')
    .find({ entityType, entityId })
    .sort({ timestamp: -1 })
    .toArray()

  return res.status(200).json(logs.map(serializeAuditLog))
}

export default {
  'get-all-page': getAllPage,
  'get-for-entity': getForEntity,
}
