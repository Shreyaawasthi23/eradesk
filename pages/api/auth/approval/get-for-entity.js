import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeApprovalRequest } from '@/lib/serializers'

export default async function handler(req, res) {
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
