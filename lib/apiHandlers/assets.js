import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'
import { serializeAsset } from '@/lib/serializers'
import { toPageResponse } from '@/lib/pagination'

async function addAssetReplacement(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const { assetId, replacementSerial } = req.query
  const { db } = auth

  const asset = await db.collection('Assets').findOne({ _id: new ObjectId(assetId) })
  if (!asset) {
    return res.status(200).json({ statusCode: 404, message: 'Asset Not Found!' })
  }

  await db.collection('Assets').updateOne(
    { _id: new ObjectId(assetId) },
    {
      $set: { serialNumber: replacementSerial, modifyDate: new Date() },
      $push: {
        replacementHistory: {
          previousSerial: asset.serialNumber,
          newSerial: replacementSerial,
          replacedDate: new Date(),
        },
      },
    },
  )

  return res.status(200).json({ statusCode: 200, message: `Replacement Added Successfully! ${replacementSerial}` })
}

async function addAssets(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const { db } = auth
  const {
    make, model, serialNumber, purchaseOrderNumber, startDate, endDate,
    sla, assetType, pinCode, city, state, address, endClientId, userId,
  } = req.body || {}

  const existing = await db.collection('Assets').findOne({
    serialNumber: { $regex: serialNumber, $options: 'i' },
  })
  if (existing) {
    return res.status(200).json({ statusCode: 409, message: `${existing.assetId} Asset already exist!` })
  }

  const user = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  if (!user) {
    return res.status(200).json({ statusCode: 404, message: 'Asset Added Successfully' })
  }

  const endClient = await db.collection('EndClient').findOne({ _id: new ObjectId(endClientId) })
  const purchaseOrder = await db.collection('PurchaseOrder').findOne({ purchaseOrderNumber })

  const seq = await nextSequence(db, 'AssetSequence', 'asset_sequence')
  const assetId = `AST00${seq}`
  const now = new Date()

  await db.collection('Assets').insertOne({
    make,
    model,
    serialNumber,
    purchaseOrderNumber,
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    sla,
    assetType,
    pinCode,
    city,
    state,
    address,
    endClientId: endClient._id.toString(),
    frontClientId: endClient.frontClientId,
    purchaseId: purchaseOrder ? purchaseOrder._id.toString() : null,
    assetId,
    userId: user._id.toString(),
    userName: `${user.firstName} ${user.lastName}`,
    createDate: now,
    modifyDate: now,
  })

  return res.status(200).json({ statusCode: 200, message: `Asset Added ${assetId}` })
}

async function assetTypeCount(req, res) {
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
    .collection('Assets')
    .aggregate([
      {
        $match: {
          createDate: {
            $gte: new Date(Date.UTC(targetYear, 0, 1)),
            $lt: new Date(Date.UTC(targetYear + 1, 0, 1)),
          },
        },
      },
      { $group: { _id: '$assetType', count: { $sum: 1 } } },
    ])
    .toArray()

  const response = results.map((r) => ({ assetType: r._id, count: r.count }))
  return res.status(200).json(response)
}

async function deleteAssets(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const { userId } = req.query
  const ids = req.body || []
  const { db } = auth

  const user = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  if (!ids.length || !user) {
    return res.status(200).json({ statusCode: 409, message: 'Asset Not Found' })
  }

  let count = 0
  for (const id of ids) {
    await db.collection('Assets').deleteOne({ _id: new ObjectId(id) })
    count++
  }

  await db.collection('AssetsChangeLog').insertOne({
    remarks: `Deleted ${count} Assets`,
    createDate: new Date(),
  })

  return res.status(200).json({ statusCode: 200, message: `${count} Assets deleted successfully!` })
}

async function detail(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { id } = req.query
  const a = await auth.db.collection('Assets').findOne({ _id: new ObjectId(id) })
  if (!a) return res.status(200).json(null)

  return res.status(200).json(serializeAsset(a))
}

async function editAssets(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const { remarks, id } = req.query
  const { db } = auth
  const {
    make, model, serialNumber, purchaseOrderNumber, startDate, endDate,
    sla, assetType, pinCode, city, state, address, endClientId, userId,
  } = req.body || {}

  const user = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  if (!user) {
    return res.status(200).json({ statusCode: 409, message: 'User Not Found' })
  }

  const existingAsset = await db.collection('Assets').findOne({ _id: new ObjectId(id) })

  const update = {
    make,
    model,
    purchaseOrderNumber,
    startDate: startDate ? new Date(startDate) : null,
    endDate: endDate ? new Date(endDate) : null,
    sla,
    assetType,
    pinCode,
    city,
    state,
    address,
    modifyDate: new Date(),
  }

  if (serialNumber !== existingAsset.serialNumber) {
    const check = await db.collection('Assets').findOne({ serialNumber })
    if (check) {
      return res.status(200).json({ statusCode: 409, message: 'Asset already exist with same serial number' })
    }
    update.serialNumber = serialNumber
  }

  const endClient = await db.collection('EndClient').findOne({ _id: new ObjectId(endClientId) })
  update.endClientId = endClient._id.toString()
  update.frontClientId = endClient.frontClientId

  const purchaseOrder = await db.collection('PurchaseOrder').findOne({ purchaseOrderNumber })
  update.purchaseId = purchaseOrder ? purchaseOrder._id.toString() : null

  await db.collection('Assets').updateOne({ _id: new ObjectId(id) }, { $set: update })

  await db.collection('AssetsChangeLog').insertOne({
    createDate: new Date(),
    remarks,
    userName: `${user.firstName} ${user.lastName}`,
    userId,
    assetId: existingAsset.assetId,
  })

  return res.status(200).json({ statusCode: 200, message: `${existingAsset.assetId} edited successfully!` })
}

async function getAllPage(req, res) {
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

  const search = (req.query.search || '').trim()
  const poNumber = (req.query.poNumber || '').trim()
  const serialNo = (req.query.serialNo || '').trim()

  const filter = {}
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ make: regex }, { model: regex }]
  }
  if (poNumber) {
    filter.purchaseOrderNumber = new RegExp(poNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  }
  if (serialNo) {
    filter.serialNumber = new RegExp(serialNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  }

  const totalElements = await db.collection('Assets').countDocuments(filter)
  const items = await db
    .collection('Assets')
    .find(filter)
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeAsset), totalElements, page, size))
}

async function getAssetDetails(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER'])) return res.status(403).end()

  const { serialNo } = req.query
  const { db } = auth
  const asset = await db.collection('Assets').findOne({ serialNumber: serialNo })
  if (!asset) return res.status(200).json(null)

  const endClient = asset.endClientId
    ? await db.collection('EndClient').findOne({ _id: new ObjectId(asset.endClientId) })
    : null
  const frontClient = asset.frontClientId
    ? await db.collection('FrontClient').findOne({ _id: new ObjectId(asset.frontClientId) })
    : null

  return res.status(200).json({
    assets: serializeAsset(asset),
    endClient: endClient ? endClient.name : null,
    frontClient: frontClient ? frontClient.name : null,
  })
}

async function getAssetsByPo(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER'])) return res.status(403).end()

  const { poNumber } = req.query
  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { db } = auth

  const filter = { purchaseOrderNumber: { $regex: poNumber, $options: 'i' } }
  const totalElements = await db.collection('Assets').countDocuments(filter)
  const items = await db
    .collection('Assets')
    .find(filter)
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeAsset), totalElements, page, size))
}

async function getAssetsBySerial(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER'])) return res.status(403).end()

  const { serialNo } = req.query
  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { db } = auth

  const filter = { serialNumber: { $regex: serialNo, $options: 'i' } }
  const totalElements = await db.collection('Assets').countDocuments(filter)
  const items = await db
    .collection('Assets')
    .find(filter)
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeAsset), totalElements, page, size))
}

const EXCEL_EPOCH_DIFF = 25569
const MILLIS_PER_DAY = 24 * 60 * 60 * 1000

function excelDate(dateNo) {
  return new Date((Number(dateNo) - EXCEL_EPOCH_DIFF) * MILLIS_PER_DAY)
}

// Excel cells with numeric-looking content (pin codes, PO numbers, etc.)
// come through as JS numbers rather than strings, so .trim() isn't safe
// to call directly on row values.
function trimmed(value) {
  return String(value ?? '').trim()
}

async function uploadAssets(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { userId } = req.query
  const { db } = auth
  const rows = req.body || []

  const user = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  if (!user) {
    return res.status(200).json({ statusCode: 409, message: 'User Not Found' })
  }

  const assetIds = []
  let assetCount = 0
  let duplicate = 0

  for (const row of rows) {
    const serialNo = trimmed(row.SerialNo)
    const checkAsset = await db.collection('Assets').findOne({ serialNumber: { $regex: serialNo, $options: 'i' } })
    if (checkAsset) {
      duplicate++
      continue
    }

    const endClient = await db.collection('EndClient').findOne({ _id: new ObjectId(trimmed(row.EndClientId)) })
    const purchaseOrder = await db.collection('PurchaseOrder').findOne({ purchaseOrderNumber: trimmed(row.PONumber) })

    const seq = await nextSequence(db, 'AssetSequence', 'asset_sequence')
    const assetId = `AST00${seq}`
    const now = new Date()

    await db.collection('Assets').insertOne({
      make: trimmed(row.Make),
      model: trimmed(row.Model),
      serialNumber: serialNo,
      purchaseOrderNumber: trimmed(row.PONumber),
      startDate: excelDate(row.StartDate),
      endDate: excelDate(row.EndDate),
      sla: trimmed(row.SLA),
      assetType: trimmed(row.AssetType),
      pinCode: trimmed(row.PinCode),
      city: trimmed(row.City),
      state: trimmed(row.State),
      address: trimmed(row.Address),
      endClientId: endClient ? endClient._id.toString() : null,
      frontClientId: endClient ? endClient.frontClientId : null,
      purchaseId: purchaseOrder ? purchaseOrder._id.toString() : null,
      assetId,
      userName: user.email,
      userId: user._id.toString(),
      createDate: now,
      modifyDate: now,
    })

    assetCount++
    assetIds.push(assetId)
  }

  const remarks = `Uploaded ${assetCount} Assets with ${duplicate} duplicates`
  await db.collection('AssetUploadChangeLogs').insertOne({
    assetId: assetIds,
    createDate: new Date(),
    count: assetCount,
    userId: user._id.toString(),
    userEmail: user.email,
    remarks,
  })

  return res.status(200).json({ statusCode: 200, message: remarks })
}

export default {
  'add-asset-replacement': addAssetReplacement,
  'add-assets': addAssets,
  'asset-type-count': assetTypeCount,
  'delete-assets': deleteAssets,
  'detail': detail,
  'edit-assets': editAssets,
  'get-all-page': getAllPage,
  'get-asset-details': getAssetDetails,
  'get-assets-by-po': getAssetsByPo,
  'get-assets-by-serial': getAssetsBySerial,
  'upload-assets': uploadAssets,
}
