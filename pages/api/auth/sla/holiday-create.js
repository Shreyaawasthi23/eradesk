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
  const { date, name } = req.body || {}

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(200).json({ statusCode: 409, message: 'date must be in YYYY-MM-DD format' })
  }

  const existing = await db.collection('Holiday').findOne({ date })
  if (existing) {
    return res.status(200).json({ statusCode: 409, message: 'A holiday is already set for this date' })
  }

  const result = await db.collection('Holiday').insertOne({ date, name: name || '' })

  return res.status(200).json({ statusCode: 200, message: 'Holiday added', id: result.insertedId.toString() })
}
