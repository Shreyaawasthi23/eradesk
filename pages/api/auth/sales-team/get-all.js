import { authenticate, hasAnyRole } from '@/lib/apiAuth'

function serialize(s) {
  return {
    id: s._id.toString(),
    name: s.name,
    email: s.email,
    number: s.number,
    status: s.status ?? true,
    createDate: s.createDate,
    userEmail: s.userEmail,
  }
}

export default async function handler(req, res) {
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
  const status = req.query.status
  const startDate = req.query.startDate
  const endDate = req.query.endDate

  const filter = {}
  if (search) {
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ name: regex }, { email: regex }]
  }
  if (status === 'true' || status === 'false') {
    filter.status = status === 'true'
  }
  if (startDate || endDate) {
    filter.createDate = {}
    if (startDate) filter.createDate.$gte = new Date(startDate)
    if (endDate) filter.createDate.$lte = new Date(endDate + 'T23:59:59.999Z')
  }

  const totalElements = await db.collection('SalesTeam').countDocuments(filter)
  const items = await db
    .collection('SalesTeam')
    .find(filter)
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  const totalPages = Math.ceil(totalElements / size) || 0
  const content = items.map(serialize)

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
