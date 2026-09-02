import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'
import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) {
    return res.status(403).end()
  }

  const { db, user } = auth
  const { name, defaultWorkGroup, defaultPriority } = req.body || {}

  if (!name) {
    return res.status(200).json({ statusCode: 409, message: 'Name is required' })
  }

  const seq = await nextSequence(db, 'MonitoringIntegrationSequence', 'monitoring_integration_sequence')
  const integrationId = `MON-${String(seq).padStart(6, '0')}`
  const now = new Date()
  const webhookToken = crypto.randomBytes(24).toString('hex')

  const newIntegration = {
    integrationId,
    name,
    webhookToken,
    defaultWorkGroup: defaultWorkGroup || '',
    defaultPriority: Number.isInteger(defaultPriority) ? defaultPriority : 3,
    active: true,
    eventCount: 0,
    lastEventDate: null,
    createDate: now,
    userId: user._id.toString(),
    userEmail: user.email,
  }

  const result = await db.collection('MonitoringIntegration').insertOne(newIntegration)

  return res.status(200).json({
    statusCode: 200,
    message: `Monitoring integration created ${integrationId}`,
    id: result.insertedId.toString(),
    webhookToken,
  })
}
