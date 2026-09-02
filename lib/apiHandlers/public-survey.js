import { ObjectId } from 'mongodb'
import { getTenantDb } from '@/lib/mongodb'
import { serializeSurveyResponse } from '@/lib/serializers'

// Public (no user auth) — a respondent reaches this via an emailed survey link.
async function getResponse(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const tenant = req.headers['x-tenant'] || req.query.tenant
  if (!tenant) return res.status(401).end()

  const { id } = req.query
  if (!id || !ObjectId.isValid(id)) {
    return res.status(404).json({ statusCode: 404, message: 'Survey not found' })
  }

  const db = await getTenantDb(tenant)
  const response = await db.collection('SurveyResponse').findOne({ _id: new ObjectId(id) })
  if (!response) {
    return res.status(404).json({ statusCode: 404, message: 'Survey not found' })
  }

  const template = await db
    .collection('SurveyTemplate')
    .findOne({ _id: new ObjectId(response.templateId) })

  return res.status(200).json({
    ...serializeSurveyResponse(response),
    questions: template ? template.questions : [],
  })
}

// Public (no user auth) submission endpoint for the respondent's answers.
async function submit(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const tenant = req.headers['x-tenant']
  if (!tenant) return res.status(401).end()

  const { id } = req.query
  const { answers } = req.body || {}
  if (!id || !ObjectId.isValid(id) || !Array.isArray(answers)) {
    return res.status(200).json({ statusCode: 409, message: 'Invalid survey id or answers' })
  }

  const db = await getTenantDb(tenant)
  const response = await db.collection('SurveyResponse').findOne({ _id: new ObjectId(id) })
  if (!response) {
    return res.status(200).json({ statusCode: 409, message: 'Survey not found' })
  }
  if (response.status === 'SUBMITTED') {
    return res.status(200).json({ statusCode: 409, message: 'This survey has already been submitted' })
  }
  if (response.status === 'SCHEDULED') {
    return res.status(200).json({ statusCode: 409, message: 'This survey has not been sent yet' })
  }

  const template = await db
    .collection('SurveyTemplate')
    .findOne({ _id: new ObjectId(response.templateId) })
  const questionById = new Map((template?.questions || []).map((q) => [q.id, q]))

  const cleanAnswers = answers
    .filter((a) => questionById.has(a.questionId))
    .map((a) => ({
      questionId: a.questionId,
      questionText: questionById.get(a.questionId).text,
      value: a.value,
    }))

  if (cleanAnswers.length === 0) {
    return res.status(200).json({ statusCode: 409, message: 'No valid answers submitted' })
  }

  await db.collection('SurveyResponse').updateOne(
    { _id: new ObjectId(id) },
    { $set: { status: 'SUBMITTED', answers: cleanAnswers, submittedDate: new Date() } },
  )

  return res.status(200).json({ statusCode: 200, message: 'Thank you for your feedback' })
}

export default {
  'get-response': getResponse,
  'submit': submit,
}
