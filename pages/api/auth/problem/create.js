import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'
import { runBusinessRules } from '@/lib/runBusinessRules'

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
  const { title, description, priority, symptoms, engineerId, workGroup, linkedIncidentIds } =
    req.body || {}

  if (!title || !description) {
    return res.status(200).json({ statusCode: 409, message: 'Title and description are required' })
  }

  const incidentIds = Array.isArray(linkedIncidentIds) ? linkedIncidentIds : []
  if (incidentIds.length) {
    const found = await db
      .collection('Incident')
      .find({ _id: { $in: incidentIds.map((id) => new ObjectId(id)) } })
      .toArray()
    if (found.length !== incidentIds.length) {
      return res.status(200).json({ statusCode: 409, message: 'One or more linked incidents were not found' })
    }
  }

  const seq = await nextSequence(db, 'ProblemSequence', 'problem_sequence')
  const problemId = `PRB-${String(seq).padStart(6, '0')}`
  const now = new Date()

  const newProblem = {
    problemId,
    title,
    description,
    priority: priority || 3,
    status: 'OPEN',
    symptoms: symptoms || '',
    rootCause: '',
    workaround: '',
    knownError: false,
    permanentSolution: '',
    closureNotes: '',
    linkedIncidentIds: incidentIds,
    linkedChangeIds: [],
    engineerId: engineerId || null,
    workGroup: workGroup || null,
    createDate: now,
    modifyDate: now,
    closeDate: null,
    userId: user._id.toString(),
    userEmail: user.email,
  }

  const result = await db.collection('Problem').insertOne(newProblem)

  await runBusinessRules(db, {
    collectionName: 'Problem',
    entityType: 'Problem',
    trigger: 'ON_CREATE',
    entityId: result.insertedId.toString(),
    entity: newProblem,
  })

  return res
    .status(200)
    .json({ statusCode: 200, message: `Problem created ${problemId}`, id: result.insertedId.toString() })
}
