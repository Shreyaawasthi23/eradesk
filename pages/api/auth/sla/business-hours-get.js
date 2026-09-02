import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { DEFAULT_BUSINESS_HOURS } from '@/lib/slaEngine'

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
  const config = await db.collection('BusinessHours').findOne({ _id: 'config' })

  return res.status(200).json(
    config
      ? { workDays: config.workDays, startMinute: config.startMinute, endMinute: config.endMinute, timezone: config.timezone }
      : { ...DEFAULT_BUSINESS_HOURS, timezone: 'UTC' },
  )
}
