import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { evaluateConditions } from '@/lib/businessRules'

// Dry-run: evaluates a set of conditions against a sample entity without persisting or
// executing anything, so the rule builder UI can show "would this match?" live.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) {
    return res.status(403).end()
  }

  const { conditions, sampleEntity } = req.body || {}
  if (typeof sampleEntity !== 'object' || sampleEntity === null) {
    return res.status(200).json({ statusCode: 409, message: 'sampleEntity object is required' })
  }

  const matches = evaluateConditions(sampleEntity, conditions || [])

  return res.status(200).json({ matches })
}
