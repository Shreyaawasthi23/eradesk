import { authenticate, hasAnyRole } from '@/lib/apiAuth'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { incidentRefId } = req.query
  const mails = await auth.db.collection('Mails').find({ incidentRefId }).toArray()

  const response = mails.map((m) => ({ ...m, id: m._id.toString(), _id: undefined }))
  return res.status(200).json(response)
}
