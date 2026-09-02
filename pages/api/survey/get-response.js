import { ObjectId } from 'mongodb'
import { getTenantDb } from '@/lib/mongodb'
import { serializeSurveyResponse } from '@/lib/serializers'

// Public (no user auth) — a respondent reaches this via an emailed survey link.
export default async function handler(req, res) {
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
