import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { buildReportQuery, groupRows, ReportQueryError, DATA_SOURCES } from '@/lib/reportQuery'

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

  const { db } = auth
  const { dataSource, fields, filters, groupBy, sortBy, sortDirection, limit } = req.body || {}

  let query
  try {
    query = buildReportQuery({ dataSource, filters, sortBy, sortDirection })
  } catch (e) {
    if (e instanceof ReportQueryError) {
      return res.status(200).json({ statusCode: 409, message: e.message })
    }
    throw e
  }

  const capped = Math.min(Number(limit) || 500, 2000)
  let cursor = db.collection(query.collection).find(query.mongoFilter)
  if (query.sortField) cursor = cursor.sort(query.sortField)
  const rows = await cursor.limit(capped).toArray()

  const projectedFields = (fields || []).filter((f) => DATA_SOURCES[dataSource].fields.includes(f))
  const projectedRows = projectedFields.length
    ? rows.map((r) => Object.fromEntries(projectedFields.map((f) => [f, r[f]])))
    : rows.map((r) => ({ ...r, _id: r._id?.toString() }))

  const grouped = groupBy ? groupRows(rows, groupBy) : null

  return res.status(200).json({
    rowCount: rows.length,
    rows: projectedRows,
    grouped,
  })
}
