import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

export default async function handler(req, res) {
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
