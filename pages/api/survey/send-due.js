import { getTenantDb } from '@/lib/mongodb'

// Cron entry point (see vercel.json) that marks scheduled surveys as SENT once their
// scheduledSendDate has passed. Mirrors pages/api/mail/poll.js's shared-secret pattern since no
// logged-in user is involved. Actual email dispatch would plug into lib/mailProvider.js here —
// left as a TODO hook since building out email delivery is a separate concern from scheduling.
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).end()
  }

  const pollSecret = process.env.MAIL_POLL_SECRET
  if (pollSecret && req.headers['x-poll-secret'] !== pollSecret) {
    return res.status(401).json({ statusCode: 401, message: 'Unauthorized' })
  }

  const tenant = process.env.NEXT_PUBLIC_TENANT
  const db = await getTenantDb(tenant)

  const now = new Date()
  const due = await db
    .collection('SurveyResponse')
    .find({ status: 'SCHEDULED', scheduledSendDate: { $lte: now } })
    .toArray()

  if (due.length === 0) {
    return res.status(200).json({ statusCode: 200, message: 'No surveys due', sent: 0 })
  }

  await db.collection('SurveyResponse').updateMany(
    { _id: { $in: due.map((d) => d._id) } },
    { $set: { status: 'SENT', sentDate: now } },
  )

  return res.status(200).json({ statusCode: 200, message: `Sent ${due.length} survey(s)`, sent: due.length })
}
