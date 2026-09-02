import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'
import crypto from 'crypto'
import { serializeMonitoringIntegration } from '@/lib/serializers'
import { toPageResponse } from '@/lib/pagination'

async function create(req, res) {
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

async function getAllPage(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) {
    return res.status(403).end()
  }

  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { db } = auth

  const totalElements = await db.collection('MonitoringIntegration').countDocuments({})
  const items = await db
    .collection('MonitoringIntegration')
    .find({})
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeMonitoringIntegration), totalElements, page, size))
}

export default {
  'create': create,
  'get-all-page': getAllPage,
}
