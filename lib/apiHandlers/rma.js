import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'
import { serializeRma, serializeRmaPurchase, serializeRmaPod } from '@/lib/serializers'
import { toPageResponse } from '@/lib/pagination'

async function createPurchaseRma(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const { db } = auth
  const { quantity, perUnitPrice, totalAmount, rmaRefId, userId, description } = req.body || {}

  const users = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  const rma = await db.collection('Rma').findOne({ _id: new ObjectId(rmaRefId) })
  if (!users || !rma) {
    return res.status(200).json({ statusCode: 409, message: 'User not found!' })
  }

  const now = new Date()
  await db.collection('RmaPurchase').insertOne({
    quantity,
    perUnitPrice,
    totalAmount,
    description,
    rmaRefId: rma._id.toString(),
    rmaId: rma.rmaId,
    endClientRefId: rma.endClientRefId,
    endClientName: rma.endClientName,
    purchaseOrderNumber: rma.purchaseOrderNumber,
    incidentRefId: rma.incidentRefId,
    incidentId: rma.incidentId,
    createDate: now,
    modifyDate: now,
    userId,
  })

  return res.status(200).json({ statusCode: 200, message: 'Purchase Recorded successfully!!' })
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
    incidentRefId, endClientRefId, purchaseOrderNumber, incidentId, make, model, serialNo,
    endClientName, contactName, contactNumber, contactEmail, fullAddress, city, state, pinCode,
    partNumber, description, quantity, userId, userEmail,
  } = req.body || {}

  const users = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  if (!users) {
    return res.status(200).json({ statusCode: 409, message: 'User not found!' })
  }

  const seq = await nextSequence(db, 'RmaSequence', 'rma_sequence')
  const rmaId = `RMA00${seq}`
  const now = new Date()

  const result = await db.collection('Rma').insertOne({
    incidentRefId,
    endClientRefId,
    purchaseOrderNumber,
    incidentId,
    make,
    model,
    serialNo,
    endClientName,
    contactName,
    contactNumber,
    contactEmail,
    fullAddress,
    city,
    state,
    pinCode,
    partNumber,
    description,
    quantity,
    userId,
    userEmail,
    createDate: now,
    modifyDate: now,
    rmaId,
    status: 'PENDING',
  })

  await db.collection('IncidentNotes').insertOne({
    incidentId: incidentRefId,
    note: `${users.email} created a new RMA for ${rmaId}`,
    userId: users._id.toString(),
    userEmail: users.email,
    createDate: now,
  })

  // NOTE: mailService.sendRmaMail is not yet ported (Mail module pending) — RMA notification
  // email is skipped here.

  return res.status(200).json({ statusCode: 200, message: `${rmaId} is registered successfully` })
}

async function details(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { id } = req.query
  const r = await auth.db.collection('Rma').findOne({ _id: new ObjectId(id) })
  if (!r) return res.status(200).json(null)

  return res.status(200).json(serializeRma(r))
}

async function editPurchaseRma(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const { id } = req.query
  const { db } = auth
  const { quantity, perUnitPrice, totalAmount, userId, description } = req.body || {}

  const users = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  const purchase = await db.collection('RmaPurchase').findOne({ _id: new ObjectId(id) })
  if (!users || !purchase) {
    return res.status(200).json({ statusCode: 409, message: 'User or Purchase not found!' })
  }

  await db.collection('RmaPurchase').updateOne(
    { _id: new ObjectId(id) },
    { $set: { quantity, perUnitPrice, totalAmount, description, modifyDate: new Date() } },
  )

  return res.status(200).json({ statusCode: 200, message: 'Purchase updated successfully!' })
}

async function edit(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER'])) return res.status(403).end()

  const { id, remarks } = req.query
  const { db } = auth
  const { partNumber, description, quantity, status, contactName, contactNumber, contactEmail, userId } = req.body || {}

  const existingRma = await db.collection('Rma').findOne({ _id: new ObjectId(id) })
  if (!existingRma) {
    return res.status(200).json({ statusCode: 409, message: 'RMA not found' })
  }

  const existingUser = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  if (!existingUser) {
    return res.status(200).json({ statusCode: 409, message: 'User Not Found!' })
  }

  await db.collection('Rma').updateOne(
    { _id: new ObjectId(id) },
    { $set: { partNumber, description, quantity, status, contactName, contactNumber, contactEmail, modifyDate: new Date() } },
  )

  await db.collection('RmaChangeLog').insertOne({
    createDate: new Date(),
    remarks,
    userName: `${existingUser.firstName} ${existingUser.lastName}`,
    userId: existingUser._id.toString(),
    rmaId: existingRma.rmaId,
  })

  return res.status(200).json({ statusCode: 200, message: `${existingRma.rmaId} Updated Successfully` })
}

async function getAll(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER'])) return res.status(403).end()

  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { db } = auth

  const totalElements = await db.collection('Rma').countDocuments({})
  const items = await db
    .collection('Rma')
    .find({})
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeRma), totalElements, page, size))
}

async function getByIncident(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER'])) return res.status(403).end()

  const { incidentId } = req.query
  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { db } = auth

  const filter = { incidentId: { $regex: incidentId, $options: 'i' } }
  const totalElements = await db.collection('Rma').countDocuments(filter)
  const items = await db.collection('Rma').find(filter).skip(page * size).limit(size).toArray()

  return res.status(200).json(toPageResponse(items.map(serializeRma), totalElements, page, size))
}

async function getIncident(req, res) {
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
  const items = await auth.db
    .collection('Rma')
    .find({ incidentRefId: incidentId })
    .sort({ createDate: -1 })
    .toArray()

  return res.status(200).json(items.map(serializeRma))
}

async function getPurchaseByRma(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const { rmaId } = req.query
  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { db } = auth

  const filter = rmaId ? { rmaRefId: rmaId } : {}
  const totalElements = await db.collection('RmaPurchase').countDocuments(filter)
  const items = await db
    .collection('RmaPurchase')
    .find(filter)
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeRmaPurchase), totalElements, page, size))
}

async function getRmaPodDetails(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER'])) return res.status(403).end()

  const { id } = req.query
  const pod = await auth.db.collection('RmaPod').findOne({ rmaId: id })
  if (!pod) return res.status(200).json(null)

  return res.status(200).json(serializeRmaPod(pod))
}

async function rmaBetweenDates(req, res) {
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
  const totalElements = await db.collection('Rma').countDocuments(filter)
  const items = await db
    .collection('Rma')
    .find(filter)
    .skip(pageNo * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeRma), totalElements, pageNo, size))
}

async function rmaByPo(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { purchaseOrder } = req.query
  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { db } = auth

  const filter = purchaseOrder ? { purchaseOrderNumber: purchaseOrder } : {}
  const totalElements = await db.collection('Rma').countDocuments(filter)
  const items = await db
    .collection('Rma')
    .find(filter)
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeRma), totalElements, page, size))
}

async function rmaByStatus(req, res) {
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
  const totalElements = await db.collection('Rma').countDocuments(filter)
  const items = await db
    .collection('Rma')
    .find(filter)
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeRma), totalElements, page, size))
}

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]

async function rmaMonthlyChart(req, res) {
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
    .collection('Rma')
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

async function rmaSearch(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { rmaNumber } = req.query
  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { db } = auth

  const filter = { rmaId: { $regex: rmaNumber, $options: 'i' } }
  const totalElements = await db.collection('Rma').countDocuments(filter)
  const items = await db.collection('Rma').find(filter).skip(page * size).limit(size).toArray()

  return res.status(200).json(toPageResponse(items.map(serializeRma), totalElements, page, size))
}

async function rmaStatusCount(req, res) {
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
    .collection('Rma')
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

async function rmaStatusUpdate(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER'])) return res.status(403).end()

  const { rmaId: id, status } = req.query
  const userId = (req.query.userId || '').trim()
  const { db } = auth

  const existingRma = await db.collection('Rma').findOne({ _id: new ObjectId(id) })
  const existingUser = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  if (!existingRma || !existingUser) {
    return res.status(200).json({ statusCode: 409, message: 'RMA not found' })
  }

  const initialStatus = existingRma.status

  if (status === 'CLOSED') {
    const hasPod = await db.collection('RmaPod').findOne({ rmaId: id })
    if (!hasPod) {
      return res.status(200).json({
        statusCode: 409,
        message: `Please upload POD against the RMA #${existingRma.rmaId}`,
      })
    }
  }

  await db.collection('Rma').updateOne({ _id: new ObjectId(id) }, { $set: { status } })

  await db.collection('IncidentNotes').insertOne({
    incidentId: existingRma.incidentRefId,
    note: `${existingUser.email} updated RMA #${existingRma.rmaId} from ${initialStatus} to ${status}`,
    userId: existingUser._id.toString(),
    userEmail: existingUser.email,
    createDate: new Date(),
  })

  return res.status(200).json({ statusCode: 200, message: `${existingRma.rmaId} Updated Successfully` })
}

export default {
  'create-purchase-rma': createPurchaseRma,
  'create': create,
  'details': details,
  'edit-purchase-rma': editPurchaseRma,
  'edit': edit,
  'get-all': getAll,
  'get-by-incident': getByIncident,
  'get-incident': getIncident,
  'get-purchase-by-rma': getPurchaseByRma,
  'get-rma-pod-details': getRmaPodDetails,
  'rma-between-dates': rmaBetweenDates,
  'rma-by-po': rmaByPo,
  'rma-by-status': rmaByStatus,
  'rma-monthly-chart': rmaMonthlyChart,
  'rma-search': rmaSearch,
  'rma-status-count': rmaStatusCount,
  'rma-status-update': rmaStatusUpdate,
}
