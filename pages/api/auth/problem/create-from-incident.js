import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'

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

  const { db, user } = auth
  const { incidentId, title, description, symptoms } = req.body || {}

  if (!incidentId) {
    return res.status(200).json({ statusCode: 409, message: 'incidentId is required' })
  }

  const incident = await db.collection('Incident').findOne({ _id: new ObjectId(incidentId) })
  if (!incident) {
    return res.status(200).json({ statusCode: 409, message: 'Incident not found' })
  }

  const seq = await nextSequence(db, 'ProblemSequence', 'problem_sequence')
  const problemId = `PRB-${String(seq).padStart(6, '0')}`
  const now = new Date()

  const newProblem = {
    problemId,
    title: title || `Problem from ${incident.incidentId}: ${incident.problem || ''}`.slice(0, 150),
    description: description || incident.problem || '',
    priority: incident.priority || 3,
    status: 'OPEN',
    symptoms: symptoms || incident.problem || '',
    rootCause: '',
    workaround: '',
    knownError: false,
    permanentSolution: '',
    closureNotes: '',
    linkedIncidentIds: [incidentId],
    linkedChangeIds: [],
    engineerId: incident.engineerId || null,
    workGroup: null,
    createDate: now,
    modifyDate: now,
    closeDate: null,
    userId: user._id.toString(),
    userEmail: user.email,
  }

  const result = await db.collection('Problem').insertOne(newProblem)

  return res.status(200).json({
    statusCode: 200,
    message: `Problem created ${problemId} from incident ${incident.incidentId}`,
    id: result.insertedId.toString(),
  })
}
