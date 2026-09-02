import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

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

  const { id } = req.query
  const { db } = auth
  const { helpful } = req.body || {}

  const field = helpful ? 'helpfulCount' : 'notHelpfulCount'
  const result = await db
    .collection('KnowledgeArticle')
    .updateOne({ _id: new ObjectId(id) }, { $inc: { [field]: 1 } })

  if (!result.matchedCount) {
    return res.status(200).json({ statusCode: 409, message: 'Knowledge article not found' })
  }

  return res.status(200).json({ statusCode: 200, message: 'Thanks for the feedback' })
}
