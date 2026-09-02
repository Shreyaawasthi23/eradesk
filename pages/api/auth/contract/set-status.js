import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { logAudit } from '@/lib/auditLog'

const STATUSES = ['ACTIVE', 'RENEWED', 'EXPIRED', 'TERMINATED']

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
  const { db, user } = auth
  const { status } = req.body || {}

  if (!STATUSES.includes(status)) {
    return res.status(200).json({ statusCode: 409, message: 'Invalid status' })
  }

  const existing = await db.collection('Contract').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Contract not found' })
  }
  if (['EXPIRED', 'TERMINATED'].includes(existing.status)) {
    return res.status(200).json({ statusCode: 409, message: `Contract is already ${existing.status}` })
  }

  await db
    .collection('Contract')
    .updateOne({ _id: new ObjectId(id) }, { $set: { status, modifyDate: new Date() } })

  await logAudit(db, {
    action: 'STATUS_CHANGE',
    entityType: 'Contract',
    entityId: id,
    entityLabel: existing.contractId,
    user,
    req,
    changes: [{ field: 'status', oldValue: existing.status, newValue: status }],
  })

  return res.status(200).json({ statusCode: 200, message: `Contract marked ${status}` })
}
