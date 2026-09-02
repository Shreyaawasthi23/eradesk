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
