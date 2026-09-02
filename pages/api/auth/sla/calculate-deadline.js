import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { calculateSlaDeadline, DEFAULT_BUSINESS_HOURS } from '@/lib/slaEngine'

// Computes response and resolution deadlines for a given entity type + priority, using the
// tenant's configured business hours, holidays, and the matching active SLA policy. This is the
// real engine — separate from lib/incidentId.js's SlaTracker elapsed-time calculator, which
// tracks time already spent, not a target deadline.
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

  const { db } = auth
  const { entityType, priority, startDate } = req.body || {}

  if (!entityType || !Number.isInteger(priority)) {
    return res.status(200).json({ statusCode: 409, message: 'entityType and integer priority are required' })
  }

  const policy = await db.collection('SLAPolicy').findOne({ entityType, active: true })
  if (!policy) {
    return res.status(200).json({ statusCode: 409, message: `No active SLA policy configured for ${entityType}` })
  }

  const target = policy.targets.find((t) => t.priority === priority)
  if (!target) {
    return res.status(200).json({ statusCode: 409, message: `Policy "${policy.name}" has no target for priority ${priority}` })
  }

  const businessHoursDoc = await db.collection('BusinessHours').findOne({ _id: 'config' })
  const businessHours = businessHoursDoc
    ? { workDays: businessHoursDoc.workDays, startMinute: businessHoursDoc.startMinute, endMinute: businessHoursDoc.endMinute }
    : DEFAULT_BUSINESS_HOURS

  const holidays = (await db.collection('Holiday').find({}).toArray()).map((h) => h.date)

  const start = startDate ? new Date(startDate) : new Date()
  const responseDeadline = calculateSlaDeadline(start, target.responseMinutes, businessHours, holidays)
  const resolutionDeadline = calculateSlaDeadline(start, target.resolutionMinutes, businessHours, holidays)

  return res.status(200).json({
    policyId: policy._id.toString(),
    policyName: policy.name,
    responseDeadline,
    resolutionDeadline,
  })
}
