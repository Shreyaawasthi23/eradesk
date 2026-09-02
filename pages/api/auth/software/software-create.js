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
