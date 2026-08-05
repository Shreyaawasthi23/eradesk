import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializePodDetails } from '@/lib/serializers'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER'])) return res.status(403).end()

  const { id } = req.query
  const pod = await auth.db.collection('PodDetails').findOne({ challanId: id })
  if (!pod) return res.status(200).json(null)

  return res.status(200).json(serializePodDetails(pod))
}
