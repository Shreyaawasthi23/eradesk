import incident from '@/lib/apiHandlers/incident'
import rma from '@/lib/apiHandlers/rma'
import purchase from '@/lib/apiHandlers/purchase'
import challan from '@/lib/apiHandlers/challan'
import assets from '@/lib/apiHandlers/assets'
import users from '@/lib/apiHandlers/users'
import salesTeam from '@/lib/apiHandlers/sales-team'
import frontClient from '@/lib/apiHandlers/front-client'
import endClient from '@/lib/apiHandlers/end-client'

const routes = {
  incident,
  rma,
  purchase,
  challan,
  assets,
  users,
  'sales-team': salesTeam,
  'front-client': frontClient,
  'end-client': endClient,
}

export default async function handler(req, res) {
  const [moduleName, ...rest] = req.query.path || []
  const action = rest.join('/')
  const mod = routes[moduleName]
  const fn = mod && mod[action]
  if (!fn) return res.status(404).end()
  return fn(req, res)
}
