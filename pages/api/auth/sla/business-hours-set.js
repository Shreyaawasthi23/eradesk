import { authenticate, hasAnyRole } from '@/lib/apiAuth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) {
    return res.status(403).end()
  }

  const { db } = auth
  const { workDays, startMinute, endMinute, timezone } = req.body || {}

  if (!Array.isArray(workDays) || workDays.length === 0) {
    return res.status(200).json({ statusCode: 409, message: 'workDays must be a non-empty array of 0-6' })
  }
  if (workDays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
    return res.status(200).json({ statusCode: 409, message: 'workDays values must be integers 0-6' })
  }
  const start = Number(startMinute)
  const end = Number(endMinute)
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > 1440 || start >= end) {
    return res.status(200).json({ statusCode: 409, message: 'startMinute must be less than endMinute, within 0-1440' })
  }

  await db.collection('BusinessHours').updateOne(
    { _id: 'config' },
    { $set: { workDays, startMinute: start, endMinute: end, timezone: timezone || 'UTC', modifyDate: new Date() } },
    { upsert: true },
  )

  return res.status(200).json({ statusCode: 200, message: 'Business hours updated' })
}
