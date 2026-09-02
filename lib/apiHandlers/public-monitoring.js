import { getTenantDb } from '@/lib/mongodb'
import { generateIncidentId } from '@/lib/incidentId'
import { runBusinessRules } from '@/lib/runBusinessRules'

// Public webhook for external monitoring systems (spec section 53: POST
// /api/integrations/monitoring/events -> create incident -> assign group -> set priority ->
// start SLA -> notify). Authenticated via a per-integration webhook token (X-Webhook-Token),
// mirroring the discovery agent's token pattern, since the caller is an unattended system with
// no user login. Deduplicates on alertId so a monitoring system re-firing the same alert (a
// common behavior — e.g. periodic re-checks while a condition persists) doesn't spam duplicate
// incidents; instead it's recorded as a repeat on the existing one.
async function events(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const tenant = req.headers['x-tenant']
  if (!tenant) return res.status(401).end()

  const integrationId = req.query.integrationId
  const webhookToken = req.headers['x-webhook-token']
  if (!integrationId || !webhookToken) return res.status(401).end()

  const db = await getTenantDb(tenant)
  const { ObjectId } = await import('mongodb')

  let integration
  try {
    integration = await db.collection('MonitoringIntegration').findOne({ _id: new ObjectId(integrationId) })
  } catch {
    return res.status(401).end()
  }
  if (!integration || integration.webhookToken !== webhookToken) {
    return res.status(401).end()
  }
  if (!integration.active) {
    return res.status(200).json({ statusCode: 409, message: 'This monitoring integration is disabled' })
  }

  const { alertId, title, description, priority, source } = req.body || {}
  if (!alertId || !title) {
    return res.status(200).json({ statusCode: 409, message: 'alertId and title are required' })
  }

  const now = new Date()

  const existing = await db.collection('Incident').findOne({ monitoringAlertId: alertId })
  if (existing) {
    await db.collection('IncidentNotes').insertOne({
      incidentId: existing.incidentId,
      incidentRefId: existing._id.toString(),
      note: `Monitoring alert re-fired: ${title}`,
      userId: null,
      userEmail: `monitoring:${integration.name}`,
      createDate: now,
      additionalDetails: description || '',
    })
    await db
      .collection('MonitoringIntegration')
      .updateOne({ _id: integration._id }, { $inc: { eventCount: 1 }, $set: { lastEventDate: now } })

    return res.status(200).json({
      statusCode: 200,
      message: `Alert already tracked as ${existing.incidentId}; recorded as repeat`,
      incidentId: existing.incidentId,
    })
  }

  const incidentId = await generateIncidentId(db)
  const resolvedPriority = Number.isInteger(priority) ? priority : integration.defaultPriority

  const newIncident = {
    incidentId,
    incidentDate: now,
    problem: title,
    fullAddress: description || '',
    priority: resolvedPriority,
    status: 'OPEN',
    workGroup: integration.defaultWorkGroup || null,
    source: 'MONITORING',
    monitoringAlertId: alertId,
    monitoringSource: source || integration.name,
    createDate: now,
    modifyDate: now,
    userId: null,
    userEmail: `monitoring:${integration.name}`,
  }

  const result = await db.collection('Incident').insertOne(newIncident)

  await db.collection('SlaTracker').insertOne({
    incidentId,
    incidentRefId: result.insertedId.toString(),
    status: 'OPEN',
    createDate: now,
    userEmail: `monitoring:${integration.name}`,
    userId: null,
  })

  await runBusinessRules(db, {
    collectionName: 'Incident',
    entityType: 'Incident',
    trigger: 'ON_CREATE',
    entityId: result.insertedId.toString(),
    entity: newIncident,
  })

  await db
    .collection('MonitoringIntegration')
    .updateOne({ _id: integration._id }, { $inc: { eventCount: 1 }, $set: { lastEventDate: now } })

  return res.status(200).json({
    statusCode: 200,
    message: `Incident created ${incidentId}`,
    incidentId,
    id: result.insertedId.toString(),
  })
}

export default {
  'events': events,
}
