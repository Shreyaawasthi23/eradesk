import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializePurchase } from '@/lib/serializers'
import { toPageResponse } from '@/lib/pagination'

async function add(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { db } = auth
  const {
    endClientId, purchaseOrderNumber, contactName, contactNumber, contactEmail,
    startDate, endDate, poReceiveDate, type, userId, status, value, salesId,
  } = req.body || {}

  const trimmedPo = (purchaseOrderNumber || '').trim()
  const exists = await db.collection('PurchaseOrder').findOne({ purchaseOrderNumber: trimmedPo })
  if (exists) {
    return res.status(200).json({ statusCode: 409, message: 'Purchase Order already exist!' })
  }

  const user = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  if (!user) {
    return res.status(200).json({ statusCode: 404, message: 'User not found' })
  }

  const endClient = await db.collection('EndClient').findOne({ _id: new ObjectId(endClientId) })
  const now = new Date()

  await db.collection('PurchaseOrder').insertOne({
    endClientId,
    frontClientId: endClient.frontClientId,
    purchaseOrderNumber: trimmedPo,
    contactName: (contactName || '').trim(),
    contactNumber: (contactNumber || '').trim(),
    contactEmail: (contactEmail || '').trim(),
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    poReceiveDate,
    type,
    createDate: now,
    modifyDate: now,
    userId: user._id.toString(),
    userName: `${user.firstName} ${user.lastName}`,
    status: status === true || status === 'true',
    value,
    salesId,
  })

  return res.status(200).json({ statusCode: 200, message: 'Purchase Order added successfully' })
}

async function byEndClient(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { endClientId } = req.query
  const items = await auth.db
    .collection('PurchaseOrder')
    .find({ endClientId, status: true })
    .toArray()

  return res.status(200).json(items.map(serializePurchase))
}

async function edit(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { locationId: id, remarks } = req.query
  if (!id && !remarks) {
    return res.status(200).json({ statusCode: 409, message: 'Remarks or Location ID is empty' })
  }

  const { db } = auth
  const {
    endClientId, purchaseOrderNumber, contactName, contactNumber, contactEmail,
    startDate, endDate, poReceiveDate, type, userId, status, value, salesId,
  } = req.body || {}

  const user = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  const purchaseOrder = await db.collection('PurchaseOrder').findOne({ _id: new ObjectId(id) })

  const endClient = await db.collection('EndClient').findOne({ _id: new ObjectId(endClientId) })

  const update = {
    endClientId,
    frontClientId: endClient.frontClientId,
    contactName: (contactName || '').trim(),
    contactNumber: (contactNumber || '').trim(),
    contactEmail: (contactEmail || '').trim(),
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    poReceiveDate,
    type,
    modifyDate: new Date(),
    status: status === true || status === 'true',
    value,
    salesId,
  }

  let assetUpdateCount = 0
  const trimmedPo = (purchaseOrderNumber || '').trim()
  if (trimmedPo !== purchaseOrder.purchaseOrderNumber) {
    const check = await db.collection('PurchaseOrder').findOne({ purchaseOrderNumber: trimmedPo })
    if (check) {
      return res.status(200).json({ statusCode: 409, message: 'Purchase already exist with same PO Number' })
    }
    const assets = await db.collection('Assets').find({ purchaseOrderNumber: purchaseOrder.purchaseOrderNumber }).toArray()
    for (const asset of assets) {
      await db.collection('Assets').updateOne(
        { _id: asset._id },
        { $set: { modifyDate: new Date(), purchaseOrderNumber: trimmedPo } },
      )
      assetUpdateCount++
    }
    update.purchaseOrderNumber = trimmedPo
  }

  await db.collection('PurchaseOrder').updateOne({ _id: new ObjectId(id) }, { $set: update })

  const finalRemarks = assetUpdateCount === 0
    ? remarks
    : `${remarks}-Purchase Order Number Edited Changes in ${assetUpdateCount} Asset(s)`

  await db.collection('PurchaseChangeLog').insertOne({
    createDate: new Date(),
    remarks: finalRemarks,
    userName: `${user.firstName} ${user.lastName}`,
    userId: user._id.toString(),
    purchaseId: id,
  })

  return res.status(200).json({ statusCode: 200, message: finalRemarks })
}

async function getAllPage(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) return res.status(403).end()

  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { db } = auth

  const search = (req.query.search || '').trim()
  const status = req.query.status
  const endClientId = req.query.endClientId
  const startDate = req.query.startDate
  const endDate = req.query.endDate

  const filter = {}
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ purchaseOrderNumber: regex }, { contactName: regex }, { contactEmail: regex }]
  }
  if (status === 'true' || status === 'false') {
    filter.status = status === 'true'
  }
  if (endClientId) {
    filter.endClientId = endClientId
  }
  if (startDate || endDate) {
    filter.startDate = {}
    if (startDate) filter.startDate.$gte = new Date(startDate)
    if (endDate) filter.startDate.$lte = new Date(endDate + 'T23:59:59.999Z')
  }

  const totalElements = await db.collection('PurchaseOrder').countDocuments(filter)
  const items = await db
    .collection('PurchaseOrder')
    .find(filter)
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializePurchase), totalElements, page, size))
}

async function getDetails(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { id } = req.query
  const p = await auth.db.collection('PurchaseOrder').findOne({ _id: new ObjectId(id) })
  if (!p) return res.status(200).json(null)

  return res.status(200).json(serializePurchase(p))
}

async function getStateCity(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER'])) return res.status(403).end()

  const { pincode } = req.query

  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`)
    const [data] = await response.json()
    const postOffice = data.PostOffice[0]

    return res.status(200).json({ city: postOffice.District, state: postOffice.State })
  } catch {
    return res.status(200).json(null)
  }
}

async function pageByEndClient(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { endClientId } = req.query
  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { db } = auth

  const filter = { endClientId }
  const totalElements = await db.collection('PurchaseOrder').countDocuments(filter)
  const items = await db
    .collection('PurchaseOrder')
    .find(filter)
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializePurchase), totalElements, page, size))
}

async function pageByPoNumber(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { poNumber } = req.query
  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { db } = auth

  // Java's equivalent counts against the wrong collection (copy-paste bug) — fixed here to
  // count PurchaseOrder itself so pagination totals are correct.
  const filter = { purchaseOrderNumber: { $regex: poNumber, $options: 'i' } }
  const totalElements = await db.collection('PurchaseOrder').countDocuments(filter)
  const items = await db
    .collection('PurchaseOrder')
    .find(filter)
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializePurchase), totalElements, page, size))
}

async function poAvailableYears(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const { db } = auth
  const currentYear = new Date().getFullYear()

  const results = await db
    .collection('PurchaseOrder')
    .aggregate([
      { $match: { poReceiveDate: { $regex: /^\d{4}-\d{2}/ } } },
      { $project: { year: { $toInt: { $substrCP: ['$poReceiveDate', 0, 4] } } } },
      { $group: { _id: '$year' } },
      { $sort: { _id: -1 } },
    ])
    .toArray()

  const years = results
    .map((r) => r._id)
    .filter((y) => y >= 2000 && y <= currentYear + 1)

  if (!years.includes(currentYear)) years.unshift(currentYear)

  return res.status(200).json(years)
}

async function poExpired(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { poNumber } = req.query
  const { db } = auth

  const existingPo = await db.collection('PurchaseOrder').findOne({ purchaseOrderNumber: poNumber })
  if (!existingPo) {
    return res.status(200).json({ statusCode: 409, message: 'Purchase Order already exist!' })
  }

  // NOTE: Java's poExpiry also writes an Assets-backup .xlsx file to a hardcoded server path
  // (/home/eradesk/Documents/AssetBackup/) — that filesystem side effect has no Next.js
  // equivalent here and is intentionally not reproduced. The status flip below is the real
  // effect the frontend depends on.
  const assetCount = await db.collection('Assets').countDocuments({ purchaseOrderNumber: existingPo.purchaseOrderNumber })

  await db.collection('PurchaseOrder').updateOne(
    { _id: existingPo._id },
    { $set: { status: false } },
  )

  return res.status(200).json({
    statusCode: 200,
    message: `Purchase Order ${existingPo.purchaseOrderNumber} expired successfully it has ${assetCount} assets please delete the Records`,
  })
}

const MONTH_NAMES__poMonthlyCount = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]

async function poMonthlyCount(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const { db } = auth
  const purchaseOrders = await db.collection('PurchaseOrder').find({ status: true }).toArray()

  const requestedYear = Number(req.query.year)
  const targetYear = Number.isInteger(requestedYear) ? requestedYear : new Date().getFullYear()
  const counts = {}

  for (const po of purchaseOrders) {
    if (!po.poReceiveDate) continue
    const [yearStr, monthStr] = po.poReceiveDate.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)
    if (year !== targetYear || !month || month < 1 || month > 12) continue
    const key = MONTH_NAMES__poMonthlyCount[month - 1]
    counts[key] = (counts[key] || 0) + 1
  }

  const response = {}
  MONTH_NAMES__poMonthlyCount.forEach((m) => (response[m] = counts[m] || 0))
  return res.status(200).json(response)
}

const MONTH_NAMES__poMonthlyValue = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]

async function poMonthlyValue(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const { db } = auth
  const requestedYear = Number(req.query.year)
  const targetYear = Number.isInteger(requestedYear) ? requestedYear : new Date().getFullYear()

  const results = await db
    .collection('PurchaseOrder')
    .aggregate([
      { $match: { poReceiveDate: { $exists: true } } },
      {
        $project: {
          monthYear: { $substrCP: ['$poReceiveDate', 0, 7] },
          value: 1,
        },
      },
      { $group: { _id: '$monthYear', totalValue: { $sum: '$value' } } },
      { $sort: { _id: 1 } },
    ])
    .toArray()

  const response = {}
  MONTH_NAMES__poMonthlyValue.forEach((m) => (response[m] = 0))

  for (const row of results) {
    const [yearStr, monthStr] = String(row._id).split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)
    if (year === targetYear && month >= 1 && month <= 12) {
      response[MONTH_NAMES__poMonthlyValue[month - 1]] = row.totalValue || 0
    }
  }

  return res.status(200).json(response)
}

async function poSalesReport(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const { db } = auth
  const requestedYear = Number(req.query.year)
  const targetYear = Number.isInteger(requestedYear) ? requestedYear : new Date().getFullYear()
  const requestedCompareYear = Number(req.query.compareYear)
  const compareYear = Number.isInteger(requestedCompareYear)
    ? requestedCompareYear
    : targetYear - 1

  const salesTeam = await db.collection('SalesTeam').find({}).toArray()

  const salesReportList = []
  for (const person of salesTeam) {
    const purchaseOrders = await db
      .collection('PurchaseOrder')
      .find({ salesId: person._id.toString() })
      .toArray()

    let currentYearCost = 0
    let lastYearCost = 0
    for (const po of purchaseOrders) {
      if (!po.poReceiveDate) continue
      const year = Number(po.poReceiveDate.split('-')[0])
      if (year === targetYear) currentYearCost += po.value || 0
      else if (year === compareYear) lastYearCost += po.value || 0
    }

    salesReportList.push({ name: person.name, currentYearCost, lastYearCost })
  }

  return res.status(200).json(salesReportList)
}

async function poTypeCount(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { db } = auth
  const results = await db
    .collection('PurchaseOrder')
    .aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }])
    .toArray()

  const response = results.map((r) => ({ assetType: r._id, count: r.count }))
  return res.status(200).json(response)
}

export default {
  'add': add,
  'by-end-client': byEndClient,
  'edit': edit,
  'get-all-page': getAllPage,
  'get-details': getDetails,
  'get-state-city': getStateCity,
  'page-by-end-client': pageByEndClient,
  'page-by-po-number': pageByPoNumber,
  'po-available-years': poAvailableYears,
  'po-expired': poExpired,
  'po-monthly-count': poMonthlyCount,
  'po-monthly-value': poMonthlyValue,
  'po-sales-report': poSalesReport,
  'po-type-count': poTypeCount,
}
