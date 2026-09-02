import sla from '@/lib/apiHandlers/sla'
import rules from '@/lib/apiHandlers/rules'
import monitoring from '@/lib/apiHandlers/monitoring'
import reports from '@/lib/apiHandlers/reports'
import audit from '@/lib/apiHandlers/audit'
import maintenance from '@/lib/apiHandlers/maintenance'
import announcement from '@/lib/apiHandlers/announcement'

const routes = {
  sla,
  rules,
  monitoring,
  reports,
  audit,
  maintenance,
  announcement,
}

export default async function handler(req, res) {
  const [moduleName, ...rest] = req.query.path || []
  const action = rest.join('/')
  const mod = routes[moduleName]
  const fn = mod && mod[action]
  if (!fn) return res.status(404).end()
  return fn(req, res)
}
