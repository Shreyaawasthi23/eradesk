import { authenticate, hasAnyRole } from '@/lib/apiAuth'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const { db } = auth
  // Mirrors SalesTeamRepository.findAllList(), which sorts on "CreateDate" (mismatched
  // casing vs the actual "createDate" field) so the sort is effectively a no-op upstream too.
  const items = await db.collection('SalesTeam').find({}).toArray()

  const response = items.map((s) => ({
    id: s._id.toString(),
    name: s.name,
    email: s.email,
    number: s.number,
    createDate: s.createDate,
    userEmail: s.userEmail,
  }))

  return res.status(200).json(response)
}
