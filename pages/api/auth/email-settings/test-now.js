import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { pollSupportMailbox } from '@/lib/mailPoller'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  try {
    const result = await pollSupportMailbox(auth.db)
    return res.status(200).json(result)
  } catch (error) {
    return res.status(200).json({ statusCode: 500, message: `Poll failed: ${error.message}` })
  }
}
