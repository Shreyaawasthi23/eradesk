import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeApprovalRequest } from '@/lib/serializers'

// "My pending approvals" — used for a technician/manager dashboard widget.
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
