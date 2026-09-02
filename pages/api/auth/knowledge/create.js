import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'

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
  const { title, description, category, tags, visibility, status, userId } = req.body || {}

  if (!title || !description) {
    return res.status(200).json({ statusCode: 409, message: 'Title and description are required' })
  }

  const seq = await nextSequence(db, 'KnowledgeArticleSequence', 'knowledge_article_sequence')
  const articleId = `KB-${String(seq).padStart(6, '0')}`
  const now = new Date()
  const initialStatus = status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'

  const newArticle = {
    articleId,
    title,
    description,
    category: category || 'General',
    tags: Array.isArray(tags) ? tags : [],
    status: initialStatus,
    visibility: visibility === 'PUBLIC' ? 'PUBLIC' : 'INTERNAL',
    version: 1,
    viewCount: 0,
    helpfulCount: 0,
    notHelpfulCount: 0,
    authorId: user._id.toString(),
    authorName: user.email,
    publishedDate: initialStatus === 'PUBLISHED' ? now : null,
    createDate: now,
    modifyDate: now,
    userId: userId || user._id.toString(),
    userEmail: user.email,
  }

  const result = await db.collection('KnowledgeArticle').insertOne(newArticle)

  return res
    .status(200)
    .json({ statusCode: 200, message: `Knowledge article created ${articleId}`, id: result.insertedId.toString() })
}
