import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { DATA_SOURCES } from '@/lib/reportQuery'

// Exposes the same allowlist buildReportQuery enforces, so the UI's field pickers can never
// offer something the backend would reject.
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const sources = Object.entries(DATA_SOURCES).map(([name, def]) => ({ name, fields: def.fields }))

  return res.status(200).json(sources)
}
