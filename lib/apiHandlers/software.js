import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeSoftwareLicense, serializeSoftware, serializeSoftwareInstallation } from '@/lib/serializers'
import { toPageResponse } from '@/lib/pagination'
import { ObjectId } from 'mongodb'
import { nextSequence } from '@/lib/sequence'

async function expiringLicenses(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { db } = auth
  const days = Number(req.query.days) || 30
  const now = new Date()
  const threshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  const licenses = await db
    .collection('SoftwareLicense')
    .find({ status: 'ACTIVE', expiryDate: { $ne: null, $lte: threshold } })
    .sort({ expiryDate: 1 })
    .toArray()

  return res.status(200).json(licenses.map(serializeSoftwareLicense))
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

  const totalElements = await db.collection('Software').countDocuments({})
  const items = await db
    .collection('Software')
    .find({})
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeSoftware), totalElements, page, size))
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
  const { db } = auth

  const software = await db.collection('Software').findOne({ _id: new ObjectId(id) })
  if (!software) {
    return res.status(404).json({ statusCode: 404, message: 'Software not found' })
  }

  const licenses = await db.collection('SoftwareLicense').find({ softwareId: id }).toArray()
  const licenseIds = licenses.map((l) => l._id.toString())
  const installations = licenseIds.length
    ? await db.collection('SoftwareInstallation').find({ licenseId: { $in: licenseIds } }).toArray()
    : []

  const totalSeats = licenses.reduce((acc, l) => acc + (l.totalSeats || 0), 0)
  const usedSeats = licenses.reduce((acc, l) => acc + (l.usedSeats || 0), 0)

  return res.status(200).json({
    ...serializeSoftware(software),
    licenses: licenses.map(serializeSoftwareLicense),
    installations: installations.map(serializeSoftwareInstallation),
    compliance: {
      totalSeats,
      usedSeats,
      availableSeats: totalSeats - usedSeats,
      overAllocated: usedSeats > totalSeats,
    },
  })
}

async function install(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { id } = req.query
  const { db, user } = auth
  const { deviceLabel, ciId, assetId, installedUserId } = req.body || {}

  if (!deviceLabel) {
    return res.status(200).json({ statusCode: 409, message: 'deviceLabel is required' })
  }

  const license = await db.collection('SoftwareLicense').findOne({ _id: new ObjectId(id) })
  if (!license) {
    return res.status(200).json({ statusCode: 409, message: 'License not found' })
  }

  // Atomic seat allocation: only succeeds if usedSeats < totalSeats at the moment of the update,
  // so two concurrent installs against the last free seat can't both succeed (no lost-update race).
  const updateResult = await db.collection('SoftwareLicense').findOneAndUpdate(
    { _id: new ObjectId(id), $expr: { $lt: ['$usedSeats', '$totalSeats'] } },
    { $inc: { usedSeats: 1 }, $set: { modifyDate: new Date() } },
    { returnDocument: 'after' },
  )

  if (!updateResult) {
    return res.status(200).json({ statusCode: 409, message: 'No available seats on this license' })
  }

  const now = new Date()
  const result = await db.collection('SoftwareInstallation').insertOne({
    licenseId: id,
    ciId: ciId || null,
    assetId: assetId || null,
    installedUserId: installedUserId || null,
    deviceLabel,
    installDate: now,
    userId: user._id.toString(),
    userEmail: user.email,
  })

  return res
    .status(200)
    .json({ statusCode: 200, message: `Installed on ${deviceLabel}`, id: result.insertedId.toString() })
}

async function licenseCreate(req, res) {
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
  const { softwareId, licenseKey, totalSeats, vendor, cost, purchaseDate, expiryDate } = req.body || {}

  if (!softwareId || !totalSeats) {
    return res.status(200).json({ statusCode: 409, message: 'softwareId and totalSeats are required' })
  }
  const seats = Number(totalSeats)
  if (!Number.isFinite(seats) || seats < 1) {
    return res.status(200).json({ statusCode: 409, message: 'totalSeats must be a positive number' })
  }

  const software = await db.collection('Software').findOne({ _id: new ObjectId(softwareId) })
  if (!software) {
    return res.status(200).json({ statusCode: 409, message: 'Software not found' })
  }

  const seq = await nextSequence(db, 'SoftwareLicenseSequence', 'software_license_sequence')
  const licenseId = `LIC-${String(seq).padStart(6, '0')}`
  const now = new Date()

  const newLicense = {
    licenseId,
    softwareId,
    softwareName: software.name,
    licenseKey: licenseKey || '',
    totalSeats: seats,
    usedSeats: 0,
    vendor: vendor || '',
    cost: cost != null ? Number(cost) : null,
    purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
    expiryDate: expiryDate ? new Date(expiryDate) : null,
    status: 'ACTIVE',
    createDate: now,
    modifyDate: now,
    userId: user._id.toString(),
    userEmail: user.email,
  }

  const result = await db.collection('SoftwareLicense').insertOne(newLicense)

  return res
    .status(200)
    .json({ statusCode: 200, message: `License created ${licenseId}`, id: result.insertedId.toString() })
}

async function search(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { db } = auth
  const q = (req.query.q || '').trim()
  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10

  if (!q) {
    return res.status(200).json(toPageResponse([], 0, page, size))
  }

  const pattern = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  const filter = { $or: [{ softwareId: pattern }, { name: pattern }, { publisher: pattern }] }

  const totalElements = await db.collection('Software').countDocuments(filter)
  const items = await db
    .collection('Software')
    .find(filter)
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeSoftware), totalElements, page, size))
}

async function softwareCreate(req, res) {
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
  const { name, publisher, category } = req.body || {}

  if (!name) {
    return res.status(200).json({ statusCode: 409, message: 'Name is required' })
  }

  const seq = await nextSequence(db, 'SoftwareSequence', 'software_sequence')
  const softwareId = `SW-${String(seq).padStart(6, '0')}`
  const now = new Date()

  const newSoftware = {
    softwareId,
    name,
    publisher: publisher || '',
    category: category || 'Other',
    createDate: now,
    modifyDate: now,
    userId: user._id.toString(),
    userEmail: user.email,
  }

  const result = await db.collection('Software').insertOne(newSoftware)

  return res
    .status(200)
    .json({ statusCode: 200, message: `Software created ${softwareId}`, id: result.insertedId.toString() })
}

async function uninstall(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { id } = req.query
  const { db } = auth

  const installation = await db.collection('SoftwareInstallation').findOne({ _id: new ObjectId(id) })
  if (!installation) {
    return res.status(200).json({ statusCode: 409, message: 'Installation not found' })
  }

  await db.collection('SoftwareInstallation').deleteOne({ _id: new ObjectId(id) })

  // Never let usedSeats go negative even if data drifted (e.g. a license was edited manually).
  await db.collection('SoftwareLicense').updateOne(
    { _id: new ObjectId(installation.licenseId), usedSeats: { $gt: 0 } },
    { $inc: { usedSeats: -1 }, $set: { modifyDate: new Date() } },
  )

  return res.status(200).json({ statusCode: 200, message: 'Uninstalled and seat released' })
}

export default {
  'expiring-licenses': expiringLicenses,
  'get-all-page': getAllPage,
  'get-detail': getDetail,
  'install': install,
  'license-create': licenseCreate,
  'search': search,
  'software-create': softwareCreate,
  'uninstall': uninstall,
}
