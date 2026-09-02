import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeKnowledgeArticle } from '@/lib/serializers'

// Lightweight relevance search over published articles: matches query terms against
// title/description/tags/category using case-insensitive regex (no text index dependency),
// used both by the Knowledge Base search page and the "similar articles" suggestion widget.
export default async function handler(req, res) {
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
