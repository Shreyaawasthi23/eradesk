import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeEndClient } from '@/lib/serializers'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) return res.status(403).end()

  const items = await auth.db
    .collection('EndClient')
    .find({ status: true })
    .sort({ createDate: -1 })
    .toArray()

  return res.status(200).json(items.map(serializeEndClient))
}
