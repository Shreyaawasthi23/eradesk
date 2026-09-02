import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { generateIncidentId } from '@/lib/incidentId'
import { serializeIncident, serializeIncidentNote } from '@/lib/serializers'
import { toPageResponse } from '@/lib/pagination'

async function addNotes(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { note, userId, incidentId } = req.query
  const { db } = auth

  const user = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  const incident = await db.collection('Incident').findOne({ _id: new ObjectId(incidentId) })
  if (!user || !incident) {
    return res.status(200).json({ statusCode: 409, message: 'Incident Not Found', additionInformation: '' })
  }

  await db.collection('IncidentNotes').insertOne({
    note,
    incidentId,
    userId,
    userEmail: user.email,
    createDate: new Date(),
  })

  await db.collection('UserPoints').insertOne({
    userId: user._id.toString(),
    points: 1,
    type: 'INCIDENT-NOTES',
    remarks: `${user.email} earned 1 points for adding note to an Incident`,
    createDate: new Date(),
  })

  return res.status(200).json({ statusCode: 200, message: `#${incident.incidentId}`, additionInformation: '' })
}

// Mirrors IncidentServiceImplementation.calculateSla(): sums duration between status transitions,
// pausing accumulation while in PENDING FOR LOGS / PENDING TO CLIENT.
function calculateSlaMinutes(trackingRecords) {
  let startTime = null
  let pauseTime = null
  let lastStatusTime = null
  let totalDurationMillis = 0
  let isClosed = false
  let isPaused = false
  let closeDate = null

  for (const record of trackingRecords) {
    const recordTime = new Date(record.createDate)

    if (record.status === 'OPEN') {
      if (startTime === null) startTime = recordTime
    } else if (record.status === 'CLOSED' || record.status === 'PENDING FOR RMA CLOSURE') {
      if (startTime !== null && !isPaused) {
        totalDurationMillis += recordTime.getTime() - lastStatusTime.getTime()
      }
      isClosed = true
      startTime = null
      if (record.status === 'CLOSED' && !closeDate) closeDate = recordTime
    } else if (record.status === 'PENDING FOR LOGS' || record.status === 'PENDING TO CLIENT') {
      if (startTime !== null && !isPaused && pauseTime === null) {
        pauseTime = recordTime
        totalDurationMillis = lastStatusTime ? recordTime.getTime() - startTime.getTime() : 0
        isPaused = true
      } else {
        totalDurationMillis += lastStatusTime ? recordTime.getTime() - lastStatusTime.getTime() : 0
        pauseTime = recordTime
        isPaused = true
      }
    } else {
      if (isPaused) {
        isPaused = false
      } else {
        totalDurationMillis += lastStatusTime ? recordTime.getTime() - lastStatusTime.getTime() : 0
      }
    }
    lastStatusTime = recordTime
  }

  if (!isClosed && startTime !== null && !isPaused) {
    totalDurationMillis += Date.now() - lastStatusTime.getTime()
  }

  const totalDurationMinutes = Math.floor(totalDurationMillis / 60000)
  const hours = Math.floor(totalDurationMinutes / 60)
  const minutes = totalDurationMinutes % 60

  return { slaTime: `${hours}hr ${minutes}min`, closeDate }
}

async function checkSla(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { incidentId } = req.query
  const { db } = auth

  const trackingRecords = await db.collection('SlaTracker').find({ incidentRefId: incidentId }).toArray()
  const { slaTime, closeDate } = calculateSlaMinutes(trackingRecords)

  const incident = await db.collection('Incident').findOne({ _id: new ObjectId(incidentId) })
  const update = { slaTime }
  if (!incident.closeDate && closeDate) {
    update.closeDate = closeDate
  }

  await db.collection('Incident').updateOne({ _id: new ObjectId(incidentId) }, { $set: update })

  return res.status(200).json(true)
}

async function create(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER'])) return res.status(403).end()

  const { db } = auth
  const {
    incidentDate, serialNumber, problem, make, model, priority, assetType,
    engineerId, poType, contactName, contactEmail, contactNumber, sla,
    pinCode, state, city, fullAddress, userId,
  } = req.body || {}

  const trimmedSerial = (serialNumber || '').trim()
  const existingAsset = await db.collection('Assets').findOne({ serialNumber: trimmedSerial })
  if (!existingAsset) {
    return res.status(200).json({ statusCode: 409, message: 'Serial Number not found!' })
  }

  const lastIncidents = await db.collection('Incident').find({ serialNumber: trimmedSerial }).toArray()
  if (lastIncidents.length) {
    const allClosed = lastIncidents.every((x) => x.status === 'CLOSED' || x.status === 'PENDING FOR RMA CLOSURE')
    if (!allClosed) {
      return res.status(200).json({
        statusCode: 409,
        message: `Incident is still not closed for Serial No ${serialNumber} please close this before logging new`,
      })
    }
  }

  const engineer = await db.collection('Users').findOne({ _id: new ObjectId(engineerId) })
  const users = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  const endClient = await db.collection('EndClient').findOne({ _id: new ObjectId(existingAsset.endClientId) })
  const frontClient = await db.collection('FrontClient').findOne({ _id: new ObjectId(existingAsset.frontClientId) })

  const incidentId = await generateIncidentId(db)
  const now = new Date()

  const newIncident = {
    incidentId,
    incidentDate: incidentDate ? new Date(incidentDate) : now,
    serialNumber: existingAsset.serialNumber,
    problem,
    make,
    model,
    priority,
    assetType,
    engineerId,
    poType,
    status: 'OPEN',
    contactName,
    contactNumber,
    contactEmail,
    sla,
    pinCode,
    state,
    city,
    fullAddress,
    purchaseOrderNumber: existingAsset.purchaseOrderNumber,
    endClientId: endClient._id.toString(),
    endClientName: endClient.name,
    frontClientId: frontClient._id.toString(),
    frontClientName: frontClient.name,
    createDate: now,
    modifyDate: now,
    userId: users._id.toString(),
    userEmail: users.email,
  }

  const result = await db.collection('Incident').insertOne(newIncident)

  // NOTE: mailService.sendIncidentLoggingMail is not yet ported (Mail module pending) — engineer
  // notification email is skipped here.

  await db.collection('UserPoints').insertOne({
    userId,
    points: 2,
    type: 'CREATE-INCIDENT',
    remarks: `${users.email} earned 2 points for creating an Incident`,
    createDate: now,
  })

  await db.collection('SlaTracker').insertOne({
    incidentId,
    incidentRefId: result.insertedId.toString(),
    status: 'OPEN',
    createDate: now,
    userEmail: users.email,
    userId: users._id.toString(),
  })

  return res.status(200).json({ statusCode: 200, message: `Incident Registered ${incidentId}` })
}

async function edit(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER'])) return res.status(403).end()

  const { id, userId } = req.query
  const { db } = auth
  const {
    incidentDate, serialNumber, problem, make, model, priority, assetType,
    poType, contactName, contactEmail, contactNumber, sla, pinCode, state, city, fullAddress,
  } = req.body || {}

  const existingIncident = await db.collection('Incident').findOne({ _id: new ObjectId(id) })
  const users = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  if (!existingIncident || !users) {
    return res.status(200).json({ statusCode: 409, message: 'Incident Not Found' })
  }

  const existingAsset = await db.collection('Assets').findOne({
    serialNumber: { $regex: serialNumber, $options: 'i' },
  })
  if (!existingAsset) {
    return res.status(200).json({ statusCode: 409, message: 'Serial Number not found!' })
  }

  const endClient = await db.collection('EndClient').findOne({ _id: new ObjectId(existingAsset.endClientId) })
  const frontClient = await db.collection('FrontClient').findOne({ _id: new ObjectId(existingAsset.frontClientId) })

  const update = {
    serialNumber,
    incidentDate: incidentDate ? new Date(incidentDate) : existingIncident.incidentDate,
    problem,
    make,
    model,
    priority,
    assetType,
    poType,
    contactName,
    contactEmail,
    contactNumber,
    sla,
    pinCode,
    state,
    city,
    fullAddress,
    endClientId: endClient._id.toString(),
    endClientName: endClient.name,
    purchaseOrderNumber: existingAsset.purchaseOrderNumber,
    frontClientId: frontClient._id.toString(),
    frontClientName: frontClient.name,
    modifyDate: new Date(),
  }

  await db.collection('Incident').updateOne({ _id: new ObjectId(id) }, { $set: update })

  return res.status(200).json({ statusCode: 200, message: 'Incident edited successfully' })
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
  const { db } = auth

  const totalElements = await db.collection('Incident').countDocuments({})
  const items = await db
    .collection('Incident')
    .find({})
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeIncident), totalElements, page, size))
}

async function getDetail(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { id } = req.query
  const i = await auth.db.collection('Incident').findOne({ _id: new ObjectId(id) })
  if (!i) return res.status(200).json(null)

  return res.status(200).json(serializeIncident(i))
}

async function getNotes(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { incidentId } = req.query
  const notes = await auth.db
    .collection('IncidentNotes')
    .find({ incidentId })
    .sort({ createDate: -1 })
    .toArray()

  return res.status(200).json(notes.map(serializeIncidentNote))
}

async function incidentBetweenDates(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { startDate, endDate } = req.query
  const pageNo = Number(req.query.pageNo) || 0
  const size = Number(req.query.size) || 10
  const { db } = auth

  const filter = { createDate: { $gte: new Date(startDate), $lte: new Date(endDate) } }
  const totalElements = await db.collection('Incident').countDocuments(filter)
  const items = await db
    .collection('Incident')
    .find(filter)
    .skip(pageNo * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeIncident), totalElements, pageNo, size))
}

async function incidentByStatus(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { status } = req.query
  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { db } = auth

  const filter = status ? { status } : {}
  const totalElements = await db.collection('Incident').countDocuments(filter)
  const items = await db
    .collection('Incident')
    .find(filter)
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeIncident), totalElements, page, size))
}

async function incidentEngineerAssign(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER'])) return res.status(403).end()

  const { incidentId: id, engineerId, userId } = req.query
  const { db } = auth

  const incident = await db.collection('Incident').findOne({ _id: new ObjectId(id) })
  const existingEngineer = incident ? await db.collection('Users').findOne({ _id: new ObjectId(incident.engineerId) }) : null
  const newEngineer = await db.collection('Users').findOne({ _id: new ObjectId(engineerId) })
  const user = await db.collection('Users').findOne({ _id: new ObjectId(userId) })

  if (!user || !incident || !newEngineer) {
    return res.status(200).json({ statusCode: 409, message: 'Incident or User Not Found', additionInformation: '' })
  }

  const now = new Date()

  await db.collection('Incident').updateOne(
    { _id: new ObjectId(id) },
    { $set: { engineerId, modifyDate: now } },
  )

  await db.collection('IncidentNotes').insertOne({
    incidentId: id,
    note: `${user.email} assigned Incident #${incident.incidentId} from Engineer - ${existingEngineer?.email} to ${newEngineer.email}`,
    userId,
    userEmail: user.email,
    createDate: now,
  })

  await db.collection('UserPoints').insertOne({
    userId: user._id.toString(),
    points: 2,
    type: 'INCIDENT-UPDATE',
    remarks: `${user.email} earned 2 points for updating an Incident's Engineer`,
    createDate: now,
  })

  // NOTE: mailService.incidentAssignMail is not yet ported (Mail module pending) — engineer
  // notification email is skipped here.

  return res.status(200).json({ statusCode: 200, message: 'Status Updated Successfully', additionInformation: '' })
}

async function incidentEngineerSearch(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { engineerId } = req.query
  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { db } = auth

  const filter = { engineerId }
  const totalElements = await db.collection('Incident').countDocuments(filter)
  const items = await db
    .collection('Incident')
    .find(filter)
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeIncident), totalElements, page, size))
}

async function incidentIdSearch(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { incidentId } = req.query
  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { db, user } = auth

  const filter = { incidentId: { $regex: incidentId, $options: 'i' } }
  if (auth.roles.length === 1 && auth.roles.includes('ROLE_ENGINEER')) {
    filter.engineerId = user._id.toString()
  }
  const totalElements = await db.collection('Incident').countDocuments(filter)
  const items = await db.collection('Incident').find(filter).skip(page * size).limit(size).toArray()

  return res.status(200).json(toPageResponse(items.map(serializeIncident), totalElements, page, size))
}

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]

async function incidentMonthlyChart(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { db } = auth
  const requestedYear = Number(req.query.year)
  const targetYear = Number.isInteger(requestedYear) ? requestedYear : new Date().getFullYear()

  const results = await db
    .collection('Incident')
    .aggregate([
      {
        $match: {
          createDate: {
            $gte: new Date(Date.UTC(targetYear, 0, 1)),
            $lt: new Date(Date.UTC(targetYear + 1, 0, 1)),
          },
        },
      },
      { $project: { month: { $month: '$createDate' } } },
      { $group: { _id: '$month', count: { $sum: 1 } } },
    ])
    .toArray()

  const response = {}
  MONTH_NAMES.forEach((m) => (response[m] = 0))
  for (const row of results) {
    if (row._id >= 1 && row._id <= 12) response[MONTH_NAMES[row._id - 1]] = row.count
  }

  return res.status(200).json(response)
}

function isToday__incidentOverviewChart(date) {
  const d = new Date(date)
  const today = new Date()
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
}

function round1(n) {
  return Math.round(n * 10) / 10
}

async function incidentOverviewChart(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { db } = auth
  const incidents = await db.collection('Incident').find({}).toArray()

  const totalIncidents = incidents.length
  const todayIncident = incidents.filter((x) => isToday__incidentOverviewChart(x.createDate)).length
  const openIncidents = incidents.filter((x) => x.status === 'OPEN').length
  const pendingForSpare = incidents.filter((x) => x.status === 'PENDING FOR SPARE').length
  const spareInTransit = incidents.filter((x) => x.status === 'SPARE IN TRANSIT').length

  const openPercentage = totalIncidents ? Math.round((openIncidents / totalIncidents) * 1000) / 10 : 0
  const pendingPercentage = totalIncidents ? Math.round((pendingForSpare / totalIncidents) * 1000) / 10 : 0
  const transitPercentage = totalIncidents ? Math.round((spareInTransit / totalIncidents) * 1000) / 10 : 0
  const todayPercentage = totalIncidents ? round1((todayIncident / totalIncidents) * 100) : 0

  return res.status(200).json({
    totalIncidents,
    todayIncident,
    openIncidents,
    pendingForSpare,
    spareInTransit,
    openPercentage,
    pendingPercentage,
    transitPercentage,
    todayPercentage,
  })
}

async function incidentPoSearch(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { poNumber } = req.query
  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { db } = auth

  const filter = { purchaseOrderNumber: { $regex: poNumber, $options: 'i' } }
  const totalElements = await db.collection('Incident').countDocuments(filter)
  const items = await db.collection('Incident').find(filter).skip(page * size).limit(size).toArray()

  return res.status(200).json(toPageResponse(items.map(serializeIncident), totalElements, page, size))
}

async function incidentSerialSearch(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { serialNumber } = req.query
  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { db, user } = auth

  const filter = { serialNumber: { $regex: serialNumber, $options: 'i' } }
  if (auth.roles.length === 1 && auth.roles.includes('ROLE_ENGINEER')) {
    filter.engineerId = user._id.toString()
  }
  const totalElements = await db.collection('Incident').countDocuments(filter)
  const items = await db.collection('Incident').find(filter).skip(page * size).limit(size).toArray()

  return res.status(200).json(toPageResponse(items.map(serializeIncident), totalElements, page, size))
}

async function incidentStatusCount(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { db } = auth
  const requestedYear = Number(req.query.year)
  const targetYear = Number.isInteger(requestedYear) ? requestedYear : new Date().getFullYear()

  const results = await db
    .collection('Incident')
    .aggregate([
      {
        $match: {
          createDate: {
            $gte: new Date(Date.UTC(targetYear, 0, 1)),
            $lt: new Date(Date.UTC(targetYear + 1, 0, 1)),
          },
        },
      },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ])
    .toArray()

  const response = results.map((r) => ({ status: r._id, count: r.count }))
  return res.status(200).json(response)
}

const POINTS_BY_STATUS = {
  'PENDING FOR DOWNTIME': { points: 1, roles: null },
  'PENDING FOR LOGS': { points: 1, roles: ['ROLE_ENGINEER'] },
  'PENDING FOR RMA': { points: 1, roles: ['ROLE_ENGINEER'] },
  'PENDING FOR SPARE': { points: 1, roles: ['ROLE_USER'] },
  'SPARE IN TRANSIT': { points: 1, roles: ['ROLE_USER'] },
  'UNDER OBSERVATION': { points: 1, roles: ['ROLE_USER'] },
}

function userHasRole(roles, roleName) {
  return roles.includes(roleName)
}

async function incidentStatusUpdate(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { incidentId: id, status, userId, additionalDetails } = req.query
  const { db } = auth

  const incident = await db.collection('Incident').findOne({ _id: new ObjectId(id) })
  const user = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  if (!user || !incident) {
    return res.status(200).json({ statusCode: 409, message: 'Incident or User Not Found', additionInformation: '' })
  }

  const initialStatus = incident.status

  if (status === 'CLOSED') {
    const rmas = await db.collection('Rma').find({ incidentRefId: id }).toArray()
    for (const rma of rmas) {
      if (!['CLOSED', 'CANCELED', 'WAITING FOR FAULTY RETURN'].includes(rma.status)) {
        return res.status(200).json({
          statusCode: 409,
          message: `Incident can't be closed as #${rma.rmaId} is still ${rma.status}`,
          additionInformation: '',
        })
      }
    }
  }

  const now = new Date()
  const userRoleDocs = await db.collection('roles').find({}).toArray()
  const roleMap = new Map(userRoleDocs.map((r) => [r._id.toString(), r.name]))
  const currentUserRoles = (user.roles || [])
    .map((r) => roleMap.get((r.$id || r.oid)?.toString()))
    .filter(Boolean)

  await db.collection('Incident').updateOne(
    { _id: new ObjectId(id) },
    { $set: { status, modifyDate: now } },
  )

  await db.collection('IncidentNotes').insertOne({
    incidentId: id,
    note: `${user.email} changed incident status from ${initialStatus} to ${status}`,
    userId,
    userEmail: user.email,
    createDate: now,
    additionalDetails,
  })

  if (status === 'CLOSED') {
    if (userHasRole(currentUserRoles, 'ROLE_ADMIN') || userHasRole(currentUserRoles, 'ROLE_ENGINEER')) {
      await db.collection('UserPoints').insertOne({
        userId: user._id.toString(),
        points: 2,
        type: 'INCIDENT-UPDATE',
        remarks: `${user.email} earned 2 points for updating an Incident to CLOSED`,
        createDate: now,
      })
    }
  } else if (POINTS_BY_STATUS[status]) {
    const rule = POINTS_BY_STATUS[status]
    if (!rule.roles || rule.roles.some((r) => userHasRole(currentUserRoles, r))) {
      await db.collection('UserPoints').insertOne({
        userId: user._id.toString(),
        points: rule.points,
        type: 'INCIDENT-UPDATE',
        remarks: `${user.email} earned ${rule.points} points for updating an Incident to ${status}`,
        createDate: now,
      })
    }
  }

  await db.collection('SlaTracker').insertOne({
    incidentId: incident.incidentId,
    incidentRefId: id,
    status,
    createDate: now,
    userEmail: user.email,
    userId: user._id.toString(),
  })

  return res.status(200).json({ statusCode: 200, message: 'Status Updated Successfully', additionInformation: '' })
}

function isToday__supportIncidentOverviewChart(date) {
  const d = new Date(date)
  const today = new Date()
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
}

function formatDate(date) {
  if (!date) return ''
  return new Date(date).toISOString().slice(0, 10)
}

const TREND_MONTHS = 6

function monthlyTrend(incidents) {
  const now = new Date()
  const buckets = []
  for (let i = TREND_MONTHS - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({ year: d.getFullYear(), month: d.getMonth(), count: 0 })
  }
  for (const incident of incidents) {
    const d = new Date(incident.createDate)
    const bucket = buckets.find((b) => b.year === d.getFullYear() && b.month === d.getMonth())
    if (bucket) bucket.count += 1
  }
  return buckets.map((b) => b.count)
}

async function supportIncidentOverviewChart(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { db } = auth

  const activeUserRoleId = new ObjectId('64410aa7bb5f311a20b39f3a')
  const users = await db
    .collection('Users')
    .find({ 'roles.$id': activeUserRoleId, status: true })
    .toArray()
  const singleRoleUsers = users.filter((u) => (u.roles || []).length === 1)

  const totalTickets = await db.collection('Incident').countDocuments({})

  const supportWorkingReports = []
  for (const user of singleRoleUsers) {
    const incidents = await db.collection('Incident').find({ userId: user._id.toString() }).toArray()

    const userTotalTickets = incidents.length
    const totalTicketsPercentage = totalTickets ? Math.round((userTotalTickets / totalTickets) * 1000) / 10 : 0

    const totalClosedTickets = incidents.filter((x) => x.status === 'CLOSED').length
    const totalClosedPercentage = userTotalTickets
      ? Math.round((totalClosedTickets / userTotalTickets) * 1000) / 10
      : 0

    const ticketsToday = incidents.filter((x) => isToday__supportIncidentOverviewChart(x.createDate)).length

    supportWorkingReports.push({
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      userCreateDate: formatDate(user.createDate),
      totalTickets: userTotalTickets,
      totalTicketsPercentage,
      totalClosedTickets,
      totalClosedPercentage,
      ticketsToday,
      lastLogin: null,
      totalTrend: monthlyTrend(incidents),
      closedTrend: monthlyTrend(incidents.filter((x) => x.status === 'CLOSED')),
    })
  }

  supportWorkingReports.sort((a, b) => b.totalTickets - a.totalTickets)

  return res.status(200).json(supportWorkingReports)
}

export default {
  'add-notes': addNotes,
  'check-sla': checkSla,
  'create': create,
  'edit': edit,
  'get-all-page': getAllPage,
  'get-detail': getDetail,
  'get-notes': getNotes,
  'incident-between-dates': incidentBetweenDates,
  'incident-by-status': incidentByStatus,
  'incident-engineer-assign': incidentEngineerAssign,
  'incident-engineer-search': incidentEngineerSearch,
  'incident-id-search': incidentIdSearch,
  'incident-monthly-chart': incidentMonthlyChart,
  'incident-overview-chart': incidentOverviewChart,
  'incident-po-search': incidentPoSearch,
  'incident-serial-search': incidentSerialSearch,
  'incident-status-count': incidentStatusCount,
  'incident-status-update': incidentStatusUpdate,
  'support-incident-overview-chart': supportIncidentOverviewChart,
}
