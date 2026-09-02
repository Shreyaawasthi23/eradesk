import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'
import crypto from 'crypto'

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
  const { name, cidr, schedule } = req.body || {}

  if (!name || !cidr) {
    return res.status(200).json({ statusCode: 409, message: 'Name and CIDR are required' })
  }
  if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/.test(cidr)) {
    return res.status(200).json({ statusCode: 409, message: 'CIDR must look like 192.168.1.0/24' })
  }

  const seq = await nextSequence(db, 'DiscoveryJobSequence', 'discovery_job_sequence')
  const jobId = `DISC-${String(seq).padStart(6, '0')}`
  const now = new Date()
  // Agents authenticate to /report with this token instead of a user JWT, since a scanner
  // running on-prem has no interactive login of its own.
  const agentToken = crypto.randomBytes(24).toString('hex')

  const newJob = {
    jobId,
    name,
    cidr,
    schedule: schedule || 'Manual',
    status: 'ACTIVE',
    agentToken,
    lastRunDate: null,
    deviceCount: 0,
    createDate: now,
    modifyDate: now,
    userId: user._id.toString(),
    userEmail: user.email,
  }

  const result = await db.collection('DiscoveryJob').insertOne(newJob)

  return res.status(200).json({
    statusCode: 200,
    message: `Discovery job created ${jobId}`,
    id: result.insertedId.toString(),
    agentToken,
  })
}
