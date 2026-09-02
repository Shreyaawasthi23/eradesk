import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'
import { serializeMaintenanceWindow } from '@/lib/serializers'
import { toPageResponse } from '@/lib/pagination'
import { ObjectId } from 'mongodb'

// Creating a maintenance window automatically creates a matching announcement, per spec
// section 90 ("Maintenance windows can automatically: Create announcements... Notify users").
async function create(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { db, user } = auth
  const { name, description, startDate, endDate, servicesAffected, sitesAffected } = req.body || {}

  if (!name || !startDate || !endDate) {
    return res.status(200).json({ statusCode: 409, message: 'name, startDate, and endDate are required' })
  }
  if (new Date(endDate) <= new Date(startDate)) {
    return res.status(200).json({ statusCode: 409, message: 'endDate must be after startDate' })
  }

  const seq = await nextSequence(db, 'MaintenanceWindowSequence', 'maintenance_window_sequence')
  const windowId = `MNT-${String(seq).padStart(6, '0')}`
  const now = new Date()

  const announcementSeq = await nextSequence(db, 'AnnouncementSequence', 'announcement_sequence')
  const announcementId = `ANN-${String(announcementSeq).padStart(6, '0')}`

  const services = Array.isArray(servicesAffected) ? servicesAffected : []
  const sites = Array.isArray(sitesAffected) ? sitesAffected : []
  const affectedSummary = services.length ? services.join(', ') : 'all services'

  const announcementResult = await db.collection('Announcement').insertOne({
    announcementId,
    title: `Scheduled Maintenance: ${name}`,
    description: description || `Maintenance affecting ${affectedSummary} from ${new Date(startDate).toLocaleString()} to ${new Date(endDate).toLocaleString()}.`,
    priority: 'HIGH',
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    audience: 'ALL',
    source: 'MAINTENANCE_WINDOW',
    sourceId: null,
    createDate: now,
    modifyDate: now,
    userId: user._id.toString(),
    userEmail: user.email,
  })

  const newWindow = {
    windowId,
    name,
    description: description || '',
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    servicesAffected: services,
    sitesAffected: sites,
    status: 'SCHEDULED',
    announcementId: announcementResult.insertedId.toString(),
    createDate: now,
    modifyDate: now,
    userId: user._id.toString(),
    userEmail: user.email,
  }

  const result = await db.collection('MaintenanceWindow').insertOne(newWindow)

  await db
    .collection('Announcement')
    .updateOne({ _id: announcementResult.insertedId }, { $set: { sourceId: result.insertedId.toString() } })

  return res.status(200).json({
    statusCode: 200,
    message: `Maintenance window created ${windowId}`,
    id: result.insertedId.toString(),
  })
}

async function getAllPage(req, res) {
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
  const { status } = req.query
  const { db } = auth

  const filter = {}
  if (status) filter.status = status

  const totalElements = await db.collection('MaintenanceWindow').countDocuments(filter)
  const items = await db
    .collection('MaintenanceWindow')
    .find(filter)
    .sort({ startDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeMaintenanceWindow), totalElements, page, size))
}

const STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

const ALLOWED_TRANSITIONS = {
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
}

async function setStatus(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { id } = req.query
  const { db } = auth
  const { status } = req.body || {}

  if (!STATUSES.includes(status)) {
    return res.status(200).json({ statusCode: 409, message: 'Invalid status' })
  }

  const existing = await db.collection('MaintenanceWindow').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Maintenance window not found' })
  }

  if (!ALLOWED_TRANSITIONS[existing.status]?.includes(status)) {
    return res.status(200).json({
      statusCode: 409,
      message: `Cannot move maintenance window from ${existing.status} to ${status}`,
    })
  }

  const now = new Date()
  await db
    .collection('MaintenanceWindow')
    .updateOne({ _id: new ObjectId(id) }, { $set: { status, modifyDate: now } })

  // Cancelling the maintenance window also ends its announcement immediately, so users stop
  // seeing a notice for maintenance that isn't happening.
  if (status === 'CANCELLED' && existing.announcementId) {
    await db
      .collection('Announcement')
      .updateOne({ _id: new ObjectId(existing.announcementId) }, { $set: { endDate: now, modifyDate: now } })
  }

  return res.status(200).json({ statusCode: 200, message: `Maintenance window marked ${status}` })
}

export default {
  'create': create,
  'get-all-page': getAllPage,
  'set-status': setStatus,
}
