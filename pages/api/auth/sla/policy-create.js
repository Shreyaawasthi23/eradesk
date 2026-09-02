import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'

// targets: [{ priority: number, responseMinutes: number, resolutionMinutes: number }, ...]
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { db, user } = auth
  const { name, entityType, targets } = req.body || {}

  if (!name || !entityType || !Array.isArray(targets) || targets.length === 0) {
    return res.status(200).json({ statusCode: 409, message: 'name, entityType, and at least one target are required' })
  }
  for (const t of targets) {
    if (!Number.isInteger(t.priority) || !(t.responseMinutes > 0) || !(t.resolutionMinutes > 0)) {
      return res.status(200).json({
        statusCode: 409,
        message: 'Each target needs an integer priority and positive responseMinutes/resolutionMinutes',
      })
    }
  }

  const seq = await nextSequence(db, 'SlaPolicySequence', 'sla_policy_sequence')
  const policyId = `SLA-${String(seq).padStart(6, '0')}`
  const now = new Date()

  const newPolicy = {
    policyId,
    name,
    entityType,
    targets,
    active: true,
    createDate: now,
    modifyDate: now,
    userId: user._id.toString(),
    userEmail: user.email,
  }

  const result = await db.collection('SLAPolicy').insertOne(newPolicy)

  return res
    .status(200)
    .json({ statusCode: 200, message: `SLA policy created ${policyId}`, id: result.insertedId.toString() })
}
