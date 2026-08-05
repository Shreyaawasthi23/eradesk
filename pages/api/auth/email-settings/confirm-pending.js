import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { confirmPendingMessages } from '@/lib/mailPoller'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const { gmailIds } = req.body || {}
  if (!Array.isArray(gmailIds) || !gmailIds.length) {
    return res.status(200).json({ statusCode: 400, message: 'No messages selected', created: 0 })
  }

  try {
    const result = await confirmPendingMessages(auth.db, gmailIds)
    return res.status(200).json(result)
  } catch (error) {
    return res.status(200).json({ statusCode: 500, message: `Failed: ${error.message}` })
  }
}
