import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeDiscoveredDevice, serializeDiscoveryJob } from '@/lib/serializers'
import { toPageResponse } from '@/lib/pagination'
import { ObjectId } from 'mongodb'
import { nextSequence } from '@/lib/sequence'
import crypto from 'crypto'
import { getTenantDb } from '@/lib/mongodb'

async function devicesGetAllPage(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { jobId, status } = req.query
  const { db } = auth

  const filter = {}
  if (jobId) filter.discoveryJobId = jobId
  if (status) filter.status = status

  const totalElements = await db.collection('DiscoveredDevice').countDocuments(filter)
  const items = await db
    .collection('DiscoveredDevice')
    .find(filter)
    .sort({ discoveredDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeDiscoveredDevice), totalElements, page, size))
}

async function ignoreDevice(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { id } = req.query
  const { db } = auth

  const result = await db
    .collection('DiscoveredDevice')
    .updateOne({ _id: new ObjectId(id), status: 'NEW' }, { $set: { status: 'IGNORED' } })

  if (!result.matchedCount) {
    return res.status(200).json({ statusCode: 409, message: 'Device not found or already processed' })
  }

  return res.status(200).json({ statusCode: 200, message: 'Device ignored' })
}

async function jobCreate(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { db, user } = auth
  const { name, cidr, schedule } = req.body || {}

  if (!name || !cidr) {
    return res.status(200).json({ statusCode: 409, message: 'Name and CIDR are required' })
  }
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/.test(cidr)) {
    return res.status(200).json({ statusCode: 409, message: 'CIDR must look like 192.168.1.0/24' })
  }

  const seq = await nextSequence(db, 'DiscoveryJobSequence', 'discovery_job_sequence')
  const jobId = `DISC-${String(seq).padStart(6, '0')}`
  const now = new Date()
  // Agents authenticate to /report with this token instead of a user JWT, since a scanner
  // running on-prem has no interactive login of its own.
  const agentToken = crypto.randomBytes(24).toString('hex')

  const newJob = {
    jobId,
    name,
    cidr,
    schedule: schedule || 'Manual',
    status: 'ACTIVE',
    agentToken,
    lastRunDate: null,
    deviceCount: 0,
    createDate: now,
    modifyDate: now,
    userId: user._id.toString(),
    userEmail: user.email,
  }

  const result = await db.collection('DiscoveryJob').insertOne(newJob)

  return res.status(200).json({
    statusCode: 200,
    message: `Discovery job created ${jobId}`,
    id: result.insertedId.toString(),
    agentToken,
  })
}

const STATUSES = ['ACTIVE', 'PAUSED']

async function jobEdit(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { id } = req.query
  const { db } = auth
  const { name, schedule, status } = req.body || {}

  const existing = await db.collection('DiscoveryJob').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Discovery job not found' })
  }
  if (status && !STATUSES.includes(status)) {
    return res.status(200).json({ statusCode: 409, message: 'Invalid status' })
  }

  const update = {
    name: name ?? existing.name,
    schedule: schedule ?? existing.schedule,
    status: status ?? existing.status,
    modifyDate: new Date(),
  }

  await db.collection('DiscoveryJob').updateOne({ _id: new ObjectId(id) }, { $set: update })

  return res.status(200).json({ statusCode: 200, message: 'Discovery job updated successfully' })
}

async function jobGetAllPage(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { db } = auth

  const totalElements = await db.collection('DiscoveryJob').countDocuments({})
  const items = await db
    .collection('DiscoveryJob')
    .find({})
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeDiscoveryJob), totalElements, page, size))
}

const DEVICE_TYPE_TO_CI_TYPE = {
  SERVER: 'SERVER',
  DESKTOP: 'DESKTOP',
  LAPTOP: 'LAPTOP',
  PRINTER: 'OTHER',
  ROUTER: 'NETWORK_DEVICE',
  SWITCH: 'NETWORK_DEVICE',
  OTHER: 'OTHER',
}

async function promoteToCi(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { id } = req.query
  const { db, user } = auth

  const device = await db.collection('DiscoveredDevice').findOne({ _id: new ObjectId(id) })
  if (!device) {
    return res.status(200).json({ statusCode: 409, message: 'Discovered device not found' })
  }
  if (device.status === 'PROMOTED') {
    return res.status(200).json({ statusCode: 409, message: 'Device has already been promoted to a CI' })
  }

  const seq = await nextSequence(db, 'CISequence', 'ci_sequence')
  const ciId = `CI-${String(seq).padStart(6, '0')}`
  const now = new Date()

  const newCI = {
    ciId,
    name: device.hostname || device.ip,
    type: DEVICE_TYPE_TO_CI_TYPE[device.deviceType] || 'OTHER',
    status: 'ACTIVE',
    assetId: null,
    ipAddress: device.ip,
    macAddress: device.mac,
    operatingSystem: device.os,
    version: '',
    owner: '',
    vendor: device.manufacturer,
    description: `Discovered via ${device.discoveryJobId}. Model: ${device.model || 'unknown'}`,
    createDate: now,
    modifyDate: now,
    userId: user._id.toString(),
    userEmail: user.email,
  }

  const result = await db.collection('ConfigurationItem').insertOne(newCI)

  await db.collection('DiscoveredDevice').updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: 'PROMOTED', promotedCIId: result.insertedId.toString() } },
  )

  return res.status(200).json({
    statusCode: 200,
    message: `Promoted to Configuration Item ${ciId}`,
    ciId: result.insertedId.toString(),
  })
}

// Ingests scan results from an external discovery agent (on-prem scanner, agent-based or
// agentless — architecture only, no scanning runs inside this deployment). Authenticated by the
// discovery job's own agentToken rather than a user JWT, since the agent has no interactive login.
// POST body: { devices: [{ ip, hostname, mac, os, deviceType, manufacturer, model }, ...] }
async function report(req, res) {
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

export default {
  'devices-get-all-page': devicesGetAllPage,
  'ignore-device': ignoreDevice,
  'job-create': jobCreate,
  'job-edit': jobEdit,
  'job-get-all-page': jobGetAllPage,
  'promote-to-ci': promoteToCi,
  'report': report,
}
