import { authenticate, hasAnyRole } from '@/lib/apiAuth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { db, user } = auth
  await db
    .collection('Notification')
    .updateMany({ userId: user._id.toString(), read: false }, { $set: { read: true } })

  return res.status(200).json({ statusCode: 200, message: 'All notifications marked as read' })
}
