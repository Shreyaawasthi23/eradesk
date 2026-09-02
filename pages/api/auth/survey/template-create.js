import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'
import crypto from 'crypto'

const QUESTION_TYPES = ['RATING', 'MULTIPLE_CHOICE', 'TEXT']

export default async function handler(req, res) {
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
