import { ObjectId } from 'mongodb'
import { getTenantDb } from '@/lib/mongodb'

// Ingests scan results from an external discovery agent (on-prem scanner, agent-based or
// agentless — architecture only, no scanning runs inside this deployment). Authenticated by the
// discovery job's own agentToken rather than a user JWT, since the agent has no interactive login.
// POST body: { devices: [{ ip, hostname, mac, os, deviceType, manufacturer, model }, ...] }
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const tenant = req.headers['x-tenant']
  if (!tenant) return res.status(401).end()

  const jobId = req.query.jobId
  const agentToken = req.headers['x-agent-token']
  if (!jobId || !agentToken) return res.status(401).end()

  const db = await getTenantDb(tenant)
  const job = await db.collection('DiscoveryJob').findOne({ _id: new ObjectId(jobId) })
  if (!job || job.agentToken !== agentToken) {
    return res.status(401).end()
  }
  if (job.status !== 'ACTIVE') {
    return res.status(200).json({ statusCode: 409, message: 'Discovery job is not active' })
  }

  const { devices } = req.body || {}
  if (!Array.isArray(devices) || devices.length === 0) {
    return res.status(200).json({ statusCode: 409, message: 'devices array is required' })
  }

  const now = new Date()
  const docs = devices
    .filter((d) => d && d.ip)
    .map((d) => ({
      discoveryJobId: jobId,
      ip: d.ip,
      hostname: d.hostname || '',
      mac: d.mac || '',
      os: d.os || '',
      deviceType: d.deviceType || 'OTHER',
      manufacturer: d.manufacturer || '',
      model: d.model || '',
      status: 'NEW',
      promotedCIId: null,
      discoveredDate: now,
    }))

  if (!docs.length) {
    return res.status(200).json({ statusCode: 409, message: 'No valid devices in payload' })
  }

  await db.collection('DiscoveredDevice').insertMany(docs)
  await db.collection('DiscoveryJob').updateOne(
    { _id: new ObjectId(jobId) },
    { $set: { lastRunDate: now, modifyDate: now }, $inc: { deviceCount: docs.length } },
  )

  return res.status(200).json({ statusCode: 200, message: `Recorded ${docs.length} device(s)` })
}
