import notification from '@/lib/apiHandlers/notification'
import survey from '@/lib/apiHandlers/survey'
import emailSettings from '@/lib/apiHandlers/email-settings'

const routes = {
  notification,
  survey,
  'email-settings': emailSettings,
}

export default async function handler(req, res) {
  const [moduleName, ...rest] = req.query.path || []
  const action = rest.join('/')
  const mod = routes[moduleName]
  const fn = mod && mod[action]
  if (!fn) return res.status(404).end()
  return fn(req, res)
}
