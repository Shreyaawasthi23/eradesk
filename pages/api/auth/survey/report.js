import { authenticate, hasAnyRole } from '@/lib/apiAuth'

// Response rate + average satisfaction (mean of all RATING-type answers), per spec section 51.
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
  const { templateId } = req.query
  const filter = templateId ? { templateId } : {}

  const responses = await db.collection('SurveyResponse').find(filter).toArray()

  const sent = responses.filter((r) => r.status === 'SENT' || r.status === 'SUBMITTED').length
  const submitted = responses.filter((r) => r.status === 'SUBMITTED').length
  const responseRate = sent > 0 ? Math.round((submitted / sent) * 1000) / 10 : 0

  const ratingValues = []
  responses.forEach((r) => {
    ;(r.answers || []).forEach((a) => {
      const n = Number(a.value)
      if (Number.isFinite(n)) ratingValues.push(n)
    })
  })
  const averageSatisfaction =
    ratingValues.length > 0
      ? Math.round((ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length) * 100) / 100
      : null

  return res.status(200).json({
    totalScheduled: responses.length,
    totalSent: sent,
    totalSubmitted: submitted,
    responseRate,
    averageSatisfaction,
  })
}
