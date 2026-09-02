import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeAuditLog } from '@/lib/serializers'

// Entity-scoped audit trail, used to render "Audit History" on a record's detail page
// (per spec section 98's UX rule that every major entity gets an Audit History tab).
export default async function handler(req, res) {
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
