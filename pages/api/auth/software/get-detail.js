import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeSoftware, serializeSoftwareLicense, serializeSoftwareInstallation } from '@/lib/serializers'

export default async function handler(req, res) {
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
