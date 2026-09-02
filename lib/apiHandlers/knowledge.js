import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'
import { ObjectId } from 'mongodb'
import { serializeKnowledgeArticle } from '@/lib/serializers'
import { toPageResponse } from '@/lib/pagination'

async function create(req, res) {
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

async function edit(req, res) {
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
  const { title, description, category, tags, visibility } = req.body || {}

  const existing = await db.collection('KnowledgeArticle').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Knowledge article not found' })
  }

  const update = {
    title,
    description,
    category: category || existing.category,
    tags: Array.isArray(tags) ? tags : existing.tags,
    visibility: visibility === 'PUBLIC' ? 'PUBLIC' : 'INTERNAL',
    version: (existing.version || 1) + 1,
    modifyDate: new Date(),
  }

  await db.collection('KnowledgeArticle').updateOne({ _id: new ObjectId(id) }, { $set: update })

  return res.status(200).json({ statusCode: 200, message: 'Knowledge article updated successfully' })
}

async function feedback(req, res) {
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

async function getAllPage(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { status, category } = req.query
  const { db } = auth

  const filter = {}
  if (status) filter.status = status
  if (category) filter.category = category

  const totalElements = await db.collection('KnowledgeArticle').countDocuments(filter)
  const items = await db
    .collection('KnowledgeArticle')
    .find(filter)
    .sort({ modifyDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res
    .status(200)
    .json(toPageResponse(items.map(serializeKnowledgeArticle), totalElements, page, size))
}

async function getDetail(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { id } = req.query
  const { db } = auth

  const article = await db.collection('KnowledgeArticle').findOne({ _id: new ObjectId(id) })
  if (!article) {
    return res.status(404).json({ statusCode: 404, message: 'Knowledge article not found' })
  }

  await db.collection('KnowledgeArticle').updateOne({ _id: new ObjectId(id) }, { $inc: { viewCount: 1 } })
  article.viewCount = (article.viewCount || 0) + 1

  return res.status(200).json(serializeKnowledgeArticle(article))
}

// Lightweight relevance search over published articles: matches query terms against
// title/description/tags/category using case-insensitive regex (no text index dependency),
// used both by the Knowledge Base search page and the "similar articles" suggestion widget.
async function search(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { db } = auth
  const q = (req.query.q || '').trim()
  const limit = Math.min(Number(req.query.limit) || 10, 50)

  if (!q) {
    return res.status(200).json([])
  }

  const terms = q.split(/\s+/).filter(Boolean).slice(0, 8)
  const termPatterns = terms.map((t) => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'))

  const matches = await db
    .collection('KnowledgeArticle')
    .find({
      status: 'PUBLISHED',
      $or: [
        { title: { $in: termPatterns } },
        { description: { $in: termPatterns } },
        { tags: { $in: termPatterns } },
        { category: { $in: termPatterns } },
      ],
    })
    .limit(200)
    .toArray()

  const scored = matches.map((a) => {
    const haystack = `${a.title} ${a.description} ${(a.tags || []).join(' ')} ${a.category}`
    const score = termPatterns.reduce((acc, p) => acc + (p.test(haystack) ? 1 : 0), 0)
    return { article: a, score }
  })

  scored.sort((a, b) => b.score - a.score || (b.article.viewCount || 0) - (a.article.viewCount || 0))

  return res.status(200).json(scored.slice(0, limit).map((s) => serializeKnowledgeArticle(s.article)))
}

const ALLOWED_STATUSES = ['DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED']

async function setStatus(req, res) {
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
  const { status } = req.body || {}

  if (!ALLOWED_STATUSES.includes(status)) {
    return res.status(200).json({ statusCode: 409, message: 'Invalid status' })
  }

  const existing = await db.collection('KnowledgeArticle').findOne({ _id: new ObjectId(id) })
  if (!existing) {
    return res.status(200).json({ statusCode: 409, message: 'Knowledge article not found' })
  }

  const update = { status, modifyDate: new Date() }
  if (status === 'PUBLISHED' && !existing.publishedDate) {
    update.publishedDate = new Date()
  }

  await db.collection('KnowledgeArticle').updateOne({ _id: new ObjectId(id) }, { $set: update })

  return res.status(200).json({ statusCode: 200, message: `Article marked ${status}` })
}

export default {
  'create': create,
  'edit': edit,
  'feedback': feedback,
  'get-all-page': getAllPage,
  'get-detail': getDetail,
  'search': search,
  'set-status': setStatus,
}
