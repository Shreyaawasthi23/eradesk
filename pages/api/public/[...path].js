import monitoring from '@/lib/apiHandlers/public-monitoring'
import purchase from '@/lib/apiHandlers/public-purchase'
import survey from '@/lib/apiHandlers/public-survey'

const routes = {
  monitoring,
  purchase,
  survey,
}

export default async function handler(req, res) {
  const [moduleName, ...rest] = req.query.path || []
  const action = rest.join('/')
  const mod = routes[moduleName]
  const fn = mod && mod[action]
  if (!fn) return res.status(404).end()
  return fn(req, res)
}
