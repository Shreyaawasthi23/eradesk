import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

export default async function handler(req, res) {
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
