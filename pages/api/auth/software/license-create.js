import { ObjectId } from 'mongodb'
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
