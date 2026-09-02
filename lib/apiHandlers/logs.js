import { authenticate, hasAnyRole } from '@/lib/apiAuth'

function serialize(l) {
  return {
    id: l._id.toString(),
    userId: l.userId ? l.userId.toString() : null,
    email: l.email,
    timestamp: l.timestamp,
  }
}

async function getAll(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { db } = auth

  const search = (req.query.search || '').trim()
  const filter = {}
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.email = regex
  }

  const totalElements = await db.collection('LoginHistory').countDocuments(filter)
  const logs = await db
    .collection('LoginHistory')
    .find(filter)
    .sort({ timestamp: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  const totalPages = Math.ceil(totalElements / size) || 0
  const content = logs.map(serialize)

  return res.status(200).json({
    content,
    totalElements,
    totalPages,
    number: page,
    size,
    numberOfElements: content.length,
    first: page === 0,
    last: page >= totalPages - 1,
    empty: content.length === 0,
  })
}

export default {
  'get-all': getAll,
}
