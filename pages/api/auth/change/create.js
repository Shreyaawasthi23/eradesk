import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'

const TYPES = ['STANDARD', 'NORMAL', 'EMERGENCY']

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
    title, description, type, priority, riskLevel, impactAnalysis,
    implementationPlan, backoutPlan, testPlan, scheduledStart, scheduledEnd,
    engineerId, workGroup, linkedIncidentIds, linkedProblemIds,
  } = req.body || {}

  if (!title || !description) {
    return res.status(200).json({ statusCode: 409, message: 'Title and description are required' })
  }
  if (type && !TYPES.includes(type)) {
    return res.status(200).json({ statusCode: 409, message: 'Invalid change type' })
  }

  const incidentIds = Array.isArray(linkedIncidentIds) ? linkedIncidentIds : []
  const problemIds = Array.isArray(linkedProblemIds) ? linkedProblemIds : []

  if (incidentIds.length) {
    const found = await db
      .collection('Incident')
      .countDocuments({ _id: { $in: incidentIds.map((id) => new ObjectId(id)) } })
    if (found !== incidentIds.length) {
      return res.status(200).json({ statusCode: 409, message: 'One or more linked incidents were not found' })
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

  const seq = await nextSequence(db, 'ChangeSequence', 'change_sequence')
  const changeId = `CHG-${String(seq).padStart(6, '0')}`
  const now = new Date()
  const changeType = type || 'NORMAL'

  const newChange = {
    changeId,
    title,
    description,
    type: changeType,
    priority: priority || 3,
    riskLevel: riskLevel || 'MEDIUM',
    // Standard changes are pre-approved (low-risk, repeatable) so they skip CAB and start ready
    // to schedule; Normal/Emergency changes require explicit CAB approval before scheduling.
    status: changeType === 'STANDARD' ? 'APPROVED' : 'DRAFT',
    impactAnalysis: impactAnalysis || '',
    implementationPlan: implementationPlan || '',
    backoutPlan: backoutPlan || '',
    testPlan: testPlan || '',
    scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
    scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
    linkedIncidentIds: incidentIds,
    linkedProblemIds: problemIds,
    approvals: [],
    engineerId: engineerId || null,
    workGroup: workGroup || null,
    closureNotes: '',
    reviewNotes: '',
    createDate: now,
    modifyDate: now,
    closeDate: null,
    userId: user._id.toString(),
    userEmail: user.email,
  }

  const result = await db.collection('Change').insertOne(newChange)

  if (problemIds.length) {
    await db
      .collection('Problem')
      .updateMany(
        { _id: { $in: problemIds.map((id) => new ObjectId(id)) } },
        { $addToSet: { linkedChangeIds: result.insertedId.toString() } },
      )
  }

  return res
    .status(200)
    .json({ statusCode: 200, message: `Change created ${changeId}`, id: result.insertedId.toString() })
}
