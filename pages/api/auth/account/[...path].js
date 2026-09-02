import signin from '@/lib/apiHandlers/signin'
import microsoft from '@/lib/apiHandlers/microsoft'
import logs from '@/lib/apiHandlers/logs'
import mail from '@/lib/apiHandlers/mail'

const routes = {
  signin,
  microsoft,
  logs,
  mail,
}

export default async function handler(req, res) {
  const [moduleName, ...rest] = req.query.path || []
  const action = rest.join('/')
  const mod = routes[moduleName]
  const fn = mod && mod[action]
  if (!fn) return res.status(404).end()
  return fn(req, res)
}
