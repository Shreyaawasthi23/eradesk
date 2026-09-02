import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { buildReportQuery, groupRows, ReportQueryError, DATA_SOURCES } from '@/lib/reportQuery'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const { db } = auth
  const { id } = req.query

  const report = await db.collection('SavedReport').findOne({ _id: new ObjectId(id) })
  if (!report) {
    return res.status(200).json({ statusCode: 409, message: 'Saved report not found' })
  }

  let query
  try {
    query = buildReportQuery(report)
  } catch (e) {
    if (e instanceof ReportQueryError) {
      return res.status(200).json({ statusCode: 409, message: e.message })
    }
    throw e
  }

  let cursor = db.collection(query.collection).find(query.mongoFilter)
  if (query.sortField) cursor = cursor.sort(query.sortField)
  const rows = await cursor.limit(2000).toArray()

  const projectedFields = (report.fields || []).filter((f) => DATA_SOURCES[report.dataSource].fields.includes(f))
  const projectedRows = projectedFields.length
    ? rows.map((r) => Object.fromEntries(projectedFields.map((f) => [f, r[f]])))
    : rows.map((r) => ({ ...r, _id: r._id?.toString() }))

  const grouped = report.groupBy ? groupRows(rows, report.groupBy) : null

  return res.status(200).json({ reportName: report.name, rowCount: rows.length, rows: projectedRows, grouped })
}
