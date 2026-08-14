import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

export default async function handler(req, res) {
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
