import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeHoliday } from '@/lib/serializers'

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

  const { db } = auth
  const holidays = await db.collection('Holiday').find({}).sort({ date: 1 }).toArray()

  return res.status(200).json(holidays.map(serializeHoliday))
}
