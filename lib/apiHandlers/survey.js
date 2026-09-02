import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeSurveyResponse, serializeSurveyTemplate } from '@/lib/serializers'
import { toPageResponse } from '@/lib/pagination'
import { ObjectId } from 'mongodb'
import { nextSequence } from '@/lib/sequence'
import crypto from 'crypto'

// Response rate + average satisfaction (mean of all RATING-type answers), per spec section 51.
async function report(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { db } = auth
  const { templateId } = req.query
  const filter = templateId ? { templateId } : {}

  const responses = await db.collection('SurveyResponse').find(filter).toArray()

  const sent = responses.filter((r) => r.status === 'SENT' || r.status === 'SUBMITTED').length
  const submitted = responses.filter((r) => r.status === 'SUBMITTED').length
  const responseRate = sent > 0 ? Math.round((submitted / sent) * 1000) / 10 : 0

  const ratingValues = []
  responses.forEach((r) => {
    ;(r.answers || []).forEach((a) => {
      const n = Number(a.value)
      if (Number.isFinite(n)) ratingValues.push(n)
    })
  })
  const averageSatisfaction =
    ratingValues.length > 0
      ? Math.round((ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length) * 100) / 100
      : null

  return res.status(200).json({
    totalScheduled: responses.length,
    totalSent: sent,
    totalSubmitted: submitted,
    responseRate,
    averageSatisfaction,
  })
}

async function responseGetAllPage(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { status, templateId } = req.query
  const { db } = auth

  const filter = {}
  if (status) filter.status = status
  if (templateId) filter.templateId = templateId

  const totalElements = await db.collection('SurveyResponse').countDocuments(filter)
  const items = await db
    .collection('SurveyResponse')
    .find(filter)
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeSurveyResponse), totalElements, page, size))
}

// Schedules a survey response record to be sent after the template's triggerDelayHours have
// elapsed — actual sending happens later via /api/survey/send-due (cron-driven), matching the
// spec's "Ticket closed -> Send survey after 1 hour" example.
async function scheduleForIncident(req, res) {
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

const QUESTION_TYPES = ['RATING', 'MULTIPLE_CHOICE', 'TEXT']

async function templateCreate(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { db, user } = auth
  const { title, description, questions, triggerDelayHours } = req.body || {}

  if (!title || !Array.isArray(questions) || questions.length === 0) {
    return res.status(200).json({ statusCode: 409, message: 'title and at least one question are required' })
  }
  for (const q of questions) {
    if (!q.text || !QUESTION_TYPES.includes(q.type)) {
      return res.status(200).json({ statusCode: 409, message: 'Each question needs text and a valid type' })
    }
    if (q.type === 'MULTIPLE_CHOICE' && (!Array.isArray(q.options) || q.options.length < 2)) {
      return res.status(200).json({ statusCode: 409, message: 'MULTIPLE_CHOICE questions need at least 2 options' })
    }
  }

  const seq = await nextSequence(db, 'SurveyTemplateSequence', 'survey_template_sequence')
  const templateId = `SVY-${String(seq).padStart(6, '0')}`
  const now = new Date()

  const newTemplate = {
    templateId,
    title,
    description: description || '',
    questions: questions.map((q) => ({
      id: crypto.randomBytes(6).toString('hex'),
      text: q.text,
      type: q.type,
      options: q.type === 'MULTIPLE_CHOICE' ? q.options : [],
    })),
    triggerDelayHours: triggerDelayHours != null && triggerDelayHours !== '' ? Number(triggerDelayHours) : 1,
    active: true,
    createDate: now,
    modifyDate: now,
    userId: user._id.toString(),
    userEmail: user.email,
  }

  const result = await db.collection('SurveyTemplate').insertOne(newTemplate)

  return res
    .status(200)
    .json({ statusCode: 200, message: `Survey template created ${templateId}`, id: result.insertedId.toString() })
}

async function templateEdit(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { id } = req.query
  const { db } = auth
  const { title, description, triggerDelayHours, active } = req.body || {}

  const existing = await db.collection('SurveyTemplate').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Survey template not found' })
  }

  const update = {
    title: title ?? existing.title,
    description: description ?? existing.description,
    triggerDelayHours: triggerDelayHours != null ? Number(triggerDelayHours) : existing.triggerDelayHours,
    active: active !== undefined ? active : existing.active,
    modifyDate: new Date(),
  }

  await db.collection('SurveyTemplate').updateOne({ _id: new ObjectId(id) }, { $set: update })

  return res.status(200).json({ statusCode: 200, message: 'Survey template updated successfully' })
}

async function templateGetActiveList(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { db } = auth
  const templates = await db.collection('SurveyTemplate').find({ active: true }).sort({ title: 1 }).toArray()

  return res.status(200).json(templates.map(serializeSurveyTemplate))
}

async function templateGetAllPage(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { db } = auth

  const totalElements = await db.collection('SurveyTemplate').countDocuments({})
  const items = await db
    .collection('SurveyTemplate')
    .find({})
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeSurveyTemplate), totalElements, page, size))
}

export default {
  'report': report,
  'response-get-all-page': responseGetAllPage,
  'schedule-for-incident': scheduleForIncident,
  'template-create': templateCreate,
  'template-edit': templateEdit,
  'template-get-active-list': templateGetActiveList,
  'template-get-all-page': templateGetAllPage,
}
