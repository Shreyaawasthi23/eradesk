import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

// Schedules a survey response record to be sent after the template's triggerDelayHours have
// elapsed — actual sending happens later via /api/survey/send-due (cron-driven), matching the
// spec's "Ticket closed -> Send survey after 1 hour" example.
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
  const { templateId, incidentId, respondentEmail } = req.body || {}

  if (!templateId || !incidentId || !respondentEmail) {
    return res.status(200).json({ statusCode: 409, message: 'templateId, incidentId, and respondentEmail are required' })
  }

  const template = await db.collection('SurveyTemplate').findOne({ _id: new ObjectId(templateId) })
  if (!template || !template.active) {
    return res.status(200).json({ statusCode: 409, message: 'Survey template not found or inactive' })
  }

  const incident = await db.collection('Incident').findOne({ _id: new ObjectId(incidentId) })
  if (!incident) {
    return res.status(200).json({ statusCode: 409, message: 'Incident not found' })
  }

  const existing = await db.collection('SurveyResponse').findOne({ incidentRefId: incidentId, templateId })
  if (existing) {
    return res.status(200).json({ statusCode: 409, message: 'A survey is already scheduled or sent for this incident' })
  }

  const now = new Date()
  const scheduledSendDate = new Date(now.getTime() + template.triggerDelayHours * 60 * 60 * 1000)

  const result = await db.collection('SurveyResponse').insertOne({
    templateId,
    templateTitle: template.title,
    incidentId: incident.incidentId,
    incidentRefId: incidentId,
    respondentEmail,
    status: 'SCHEDULED',
    answers: [],
    scheduledSendDate,
    sentDate: null,
    submittedDate: null,
    createDate: now,
  })

  return res.status(200).json({
    statusCode: 200,
    message: `Survey scheduled for ${scheduledSendDate.toLocaleString()}`,
    id: result.insertedId.toString(),
  })
}
