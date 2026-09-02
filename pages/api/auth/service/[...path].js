import catalog from '@/lib/apiHandlers/catalog'
import vendor from '@/lib/apiHandlers/vendor'
import contract from '@/lib/apiHandlers/contract'
import approval from '@/lib/apiHandlers/approval'
import knowledge from '@/lib/apiHandlers/knowledge'

const routes = {
  catalog,
  vendor,
  contract,
  approval,
  knowledge,
}

export default async function handler(req, res) {
  const [moduleName, ...rest] = req.query.path || []
  const action = rest.join('/')
  const mod = routes[moduleName]
  const fn = mod && mod[action]
  if (!fn) return res.status(404).end()
  return fn(req, res)
}
