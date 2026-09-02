import { getTenantDb } from '@/lib/mongodb'
import { expirePastDuePurchaseOrders } from '@/lib/purchaseOrderExpiry'

// Background/cron entry point for auto-expiring Purchase Orders whose endDate
// has passed. No logged-in user is involved, so this is guarded by a shared
// secret instead of JWT auth — same pattern as pages/api/mail/poll.js.
async function expirePastDue(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).end()
  }

  const pollSecret = process.env.MAIL_POLL_SECRET
  if (pollSecret && req.headers['x-poll-secret'] !== pollSecret) {
    return res.status(401).json({ statusCode: 401, message: 'Unauthorized' })
  }

  const tenant = process.env.NEXT_PUBLIC_TENANT
  const db = await getTenantDb(tenant)

  try {
    const result = await expirePastDuePurchaseOrders(db)
    return res.status(200).json(result)
  } catch (error) {
    return res.status(200).json({ statusCode: 500, message: `Expiry check failed: ${error.message}` })
  }
}

export default {
  'expire-past-due': expirePastDue,
}
