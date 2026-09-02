import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeAnnouncement } from '@/lib/serializers'

// Currently-live announcements (now falls within startDate..endDate), for dashboard/portal
// display — matches spec section 38's "display in self-service portal / technician portal /
// dashboard".
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

  const { db } = auth
  const now = new Date()

  const announcements = await db
    .collection('Announcement')
    .find({ startDate: { $lte: now }, endDate: { $gte: now } })
    .sort({ priority: -1, startDate: -1 })
    .toArray()

  return res.status(200).json(announcements.map(serializeAnnouncement))
}
