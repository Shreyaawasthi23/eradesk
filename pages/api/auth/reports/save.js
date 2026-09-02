import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { nextSequence } from '@/lib/sequence'
import { buildReportQuery, ReportQueryError } from '@/lib/reportQuery'

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
  const { name, dataSource, fields, filters, groupBy, sortBy, sortDirection } = req.body || {}

  if (!name) {
    return res.status(200).json({ statusCode: 409, message: 'Name is required' })
  }

  try {
    buildReportQuery({ dataSource, filters, sortBy, sortDirection })
  } catch (e) {
    if (e instanceof ReportQueryError) {
      return res.status(200).json({ statusCode: 409, message: e.message })
    }
    throw e
  }

  const seq = await nextSequence(db, 'SavedReportSequence', 'saved_report_sequence')
  const reportId = `RPT-${String(seq).padStart(6, '0')}`
  const now = new Date()

  const newReport = {
    reportId,
    name,
    dataSource,
    fields: fields || [],
    filters: filters || [],
    groupBy: groupBy || null,
    sortBy: sortBy || null,
    sortDirection: sortDirection || 'ASC',
    createDate: now,
    userId: user._id.toString(),
    userEmail: user.email,
  }

  const result = await db.collection('SavedReport').insertOne(newReport)

  return res
    .status(200)
    .json({ statusCode: 200, message: `Report saved ${reportId}`, id: result.insertedId.toString() })
}
