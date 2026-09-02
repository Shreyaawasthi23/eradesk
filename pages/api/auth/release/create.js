import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'

const TYPES = ['MAJOR', 'MINOR', 'PATCH', 'EMERGENCY']

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
  const {
    title, description, version, type, plannedDate,
    engineerId, workGroup, linkedChangeIds, linkedProblemIds, linkedIncidentIds,
  } = req.body || {}

  if (!title || !description) {
    return res.status(200).json({ statusCode: 409, message: 'Title and description are required' })
  }
  if (type && !TYPES.includes(type)) {
    return res.status(200).json({ statusCode: 409, message: 'Invalid release type' })
  }

  const changeIds = Array.isArray(linkedChangeIds) ? linkedChangeIds : []
  const problemIds = Array.isArray(linkedProblemIds) ? linkedProblemIds : []
  const incidentIds = Array.isArray(linkedIncidentIds) ? linkedIncidentIds : []

  if (changeIds.length) {
    const found = await db
      .collection('Change')
      .countDocuments({ _id: { $in: changeIds.map((id) => new ObjectId(id)) } })
    if (found !== changeIds.length) {
      return res.status(200).json({ statusCode: 409, message: 'One or more linked changes were not found' })
    }
  }
  if (problemIds.length) {
    const found = await db
      .collection('Problem')
      .countDocuments({ _id: { $in: problemIds.map((id) => new ObjectId(id)) } })
    if (found !== problemIds.length) {
      return res.status(200).json({ statusCode: 409, message: 'One or more linked problems were not found' })
    }
  }
  if (incidentIds.length) {
    const found = await db
      .collection('Incident')
      .countDocuments({ _id: { $in: incidentIds.map((id) => new ObjectId(id)) } })
    if (found !== incidentIds.length) {
      return res.status(200).json({ statusCode: 409, message: 'One or more linked incidents were not found' })
    }
  }

  const seq = await nextSequence(db, 'ReleaseSequence', 'release_sequence')
  const releaseId = `REL-${String(seq).padStart(6, '0')}`
  const now = new Date()

  const newRelease = {
    releaseId,
    title,
    description,
    version: version || '',
    type: type || 'MINOR',
    status: 'PLANNING',
    plannedDate: plannedDate ? new Date(plannedDate) : null,
    deployedDate: null,
    testNotes: '',
    rollbackPlan: '',
    postReleaseReview: '',
    linkedChangeIds: changeIds,
    linkedProblemIds: problemIds,
    linkedIncidentIds: incidentIds,
    engineerId: engineerId || null,
    workGroup: workGroup || null,
    createDate: now,
    modifyDate: now,
    closeDate: null,
    userId: user._id.toString(),
    userEmail: user.email,
  }

  const result = await db.collection('Release').insertOne(newRelease)

  return res
    .status(200)
    .json({ statusCode: 200, message: `Release created ${releaseId}`, id: result.insertedId.toString() })
}
