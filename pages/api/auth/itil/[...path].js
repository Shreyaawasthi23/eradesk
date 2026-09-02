import problem from '@/lib/apiHandlers/problem'
import change from '@/lib/apiHandlers/change'
import release from '@/lib/apiHandlers/release'
import cmdb from '@/lib/apiHandlers/cmdb'
import discovery from '@/lib/apiHandlers/discovery'
import software from '@/lib/apiHandlers/software'

const routes = {
  problem,
  change,
  release,
  cmdb,
  discovery,
  software,
}

export default async function handler(req, res) {
  const [moduleName, ...rest] = req.query.path || []
  const action = rest.join('/')
  const mod = routes[moduleName]
  const fn = mod && mod[action]
  if (!fn) return res.status(404).end()
  return fn(req, res)
}
