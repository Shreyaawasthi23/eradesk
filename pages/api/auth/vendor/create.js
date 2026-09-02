import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'

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
