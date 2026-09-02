import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'
import { ObjectId } from 'mongodb'
import { serializeVendor } from '@/lib/serializers'
import { toPageResponse } from '@/lib/pagination'

async function create(req, res) {
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
  const { name, contactPerson, email, phone, address, website } = req.body || {}

  if (!name) {
    return res.status(200).json({ statusCode: 409, message: 'Vendor name is required' })
  }

  const seq = await nextSequence(db, 'VendorSequence', 'vendor_sequence')
  const vendorId = `VEN-${String(seq).padStart(6, '0')}`
  const now = new Date()

  const newVendor = {
    vendorId,
    name,
    contactPerson: contactPerson || '',
    email: email || '',
    phone: phone || '',
    address: address || '',
    website: website || '',
    status: true,
    createDate: now,
    modifyDate: now,
    userId: user._id.toString(),
    userEmail: user.email,
  }

  const result = await db.collection('Vendor').insertOne(newVendor)

  return res
    .status(200)
    .json({ statusCode: 200, message: `Vendor created ${vendorId}`, id: result.insertedId.toString() })
}

async function edit(req, res) {
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
  const { name, contactPerson, email, phone, address, website, status } = req.body || {}

  const existing = await db.collection('Vendor').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Vendor not found' })
  }

  const update = {
    name: name ?? existing.name,
    contactPerson: contactPerson ?? existing.contactPerson,
    email: email ?? existing.email,
    phone: phone ?? existing.phone,
    address: address ?? existing.address,
    website: website ?? existing.website,
    status: status !== undefined ? status : existing.status,
    modifyDate: new Date(),
  }

  await db.collection('Vendor').updateOne({ _id: new ObjectId(id) }, { $set: update })

  return res.status(200).json({ statusCode: 200, message: 'Vendor updated successfully' })
}

// Unpaginated list for dropdown pickers (contract creation, etc), mirroring
// sales-team/get-all-list.js's convention.
async function getAllList(req, res) {
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
  const vendors = await db.collection('Vendor').find({ status: true }).sort({ name: 1 }).toArray()

  return res.status(200).json(vendors.map(serializeVendor))
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

  const totalElements = await db.collection('Vendor').countDocuments({})
  const items = await db
    .collection('Vendor')
    .find({})
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeVendor), totalElements, page, size))
}

export default {
  'create': create,
  'edit': edit,
  'get-all-list': getAllList,
  'get-all-page': getAllPage,
}
