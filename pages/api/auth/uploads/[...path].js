import challanAddPod from '@/lib/apiHandlers/challan-add-pod'
import rmaAddRmaPod from '@/lib/apiHandlers/rma-add-rma-pod'

export const config = { api: { bodyParser: false } }

const routes = {
  challan: challanAddPod,
  rma: rmaAddRmaPod,
}

export default async function handler(req, res) {
  const [moduleName, ...rest] = req.query.path || []
  const action = rest.join('/')
  const mod = routes[moduleName]
  const fn = mod && mod[action]
  if (!fn) return res.status(404).end()
  return fn(req, res)
}
