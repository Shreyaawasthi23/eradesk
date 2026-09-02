import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

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
  const { db } = auth
  const {
    title, description, priority, riskLevel, impactAnalysis,
    implementationPlan, backoutPlan, testPlan, scheduledStart, scheduledEnd,
    engineerId, workGroup,
  } = req.body || {}

  const existing = await db.collection('Change').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Change not found' })
  }
  const editableStatuses = ['DRAFT', 'PENDING_APPROVAL', 'REJECTED', 'APPROVED']
  if (!editableStatuses.includes(existing.status)) {
    return res
      .status(200)
      .json({ statusCode: 409, message: `Change cannot be edited while ${existing.status}` })
  }

  // Once approved, the change plan itself (what/why/risk) is locked in — only scheduling and
  // assignment may still change, since CAB signed off on the plan, not the calendar slot.
  const isApproved = existing.status === 'APPROVED'
  const update = {
    title: isApproved ? existing.title : (title ?? existing.title),
    description: isApproved ? existing.description : (description ?? existing.description),
    priority: isApproved ? existing.priority : (priority ?? existing.priority),
    riskLevel: isApproved ? existing.riskLevel : (riskLevel ?? existing.riskLevel),
    impactAnalysis: isApproved ? existing.impactAnalysis : (impactAnalysis ?? existing.impactAnalysis),
    implementationPlan: isApproved ? existing.implementationPlan : (implementationPlan ?? existing.implementationPlan),
    backoutPlan: isApproved ? existing.backoutPlan : (backoutPlan ?? existing.backoutPlan),
    testPlan: isApproved ? existing.testPlan : (testPlan ?? existing.testPlan),
    scheduledStart: scheduledStart ? new Date(scheduledStart) : existing.scheduledStart,
    scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : existing.scheduledEnd,
    engineerId: engineerId ?? existing.engineerId,
    workGroup: workGroup ?? existing.workGroup,
    modifyDate: new Date(),
  }

  await db.collection('Change').updateOne({ _id: new ObjectId(id) }, { $set: update })

  return res.status(200).json({ statusCode: 200, message: 'Change updated successfully' })
}
