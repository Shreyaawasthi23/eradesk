import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

const RELATIONSHIP_TYPES = ['HOSTS', 'USES', 'DEPENDS_ON', 'CONNECTED_TO', 'RUNS_ON']

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
  const { sourceId, targetId, relationshipType } = req.body || {}

  if (!sourceId || !targetId || !relationshipType) {
    return res.status(200).json({ statusCode: 409, message: 'sourceId, targetId, and relationshipType are required' })
  }
  if (!RELATIONSHIP_TYPES.includes(relationshipType)) {
    return res.status(200).json({ statusCode: 409, message: 'Invalid relationship type' })
  }
  if (sourceId === targetId) {
    return res.status(200).json({ statusCode: 409, message: 'A CI cannot have a relationship with itself' })
  }

  const [source, target] = await Promise.all([
    db.collection('ConfigurationItem').findOne({ _id: new ObjectId(sourceId) }),
    db.collection('ConfigurationItem').findOne({ _id: new ObjectId(targetId) }),
  ])
  if (!source || !target) {
    return res.status(200).json({ statusCode: 409, message: 'Source or target CI not found' })
  }

  const existing = await db
    .collection('CIRelationship')
    .findOne({ sourceId, targetId, relationshipType })
  if (existing) {
    return res.status(200).json({ statusCode: 409, message: 'This relationship already exists' })
  }

  const now = new Date()
  const result = await db.collection('CIRelationship').insertOne({
    sourceId,
    targetId,
    relationshipType,
    createDate: now,
    userId: user._id.toString(),
    userEmail: user.email,
  })

  return res
    .status(200)
    .json({ statusCode: 200, message: `Linked ${source.name} ${relationshipType} ${target.name}`, id: result.insertedId.toString() })
}
