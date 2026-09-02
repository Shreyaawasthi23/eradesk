import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { DATA_SOURCES, buildReportQuery, groupRows, ReportQueryError } from '@/lib/reportQuery'
import { ObjectId } from 'mongodb'
import { serializeSavedReport } from '@/lib/serializers'
import { toPageResponse } from '@/lib/pagination'
import { nextSequence } from '@/lib/sequence'

// Exposes the same allowlist buildReportQuery enforces, so the UI's field pickers can never
// offer something the backend would reject.
async function dataSources(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const sources = Object.entries(DATA_SOURCES).map(([name, def]) => ({ name, fields: def.fields }))

  return res.status(200).json(sources)
}

async function deleteAction(req, res) {
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

  const result = await db.collection('SavedReport').deleteOne({ _id: new ObjectId(id) })
  if (!result.deletedCount) {
    return res.status(200).json({ statusCode: 409, message: 'Saved report not found' })
  }

  return res.status(200).json({ statusCode: 200, message: 'Report deleted' })
}

async function getAllPage(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) {
    return res.status(403).end()
  }

  const page = Number(req.query.page) || 0
  const size = Number(req.query.size) || 10
  const { db } = auth

  const totalElements = await db.collection('SavedReport').countDocuments({})
  const items = await db
    .collection('SavedReport')
    .find({})
    .sort({ createDate: -1 })
    .skip(page * size)
    .limit(size)
    .toArray()

  return res.status(200).json(toPageResponse(items.map(serializeSavedReport), totalElements, page, size))
}

async function runSaved(req, res) {
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

async function run(req, res) {
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

async function save(req, res) {
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

export default {
  'data-sources': dataSources,
  'delete': deleteAction,
  'get-all-page': getAllPage,
  'run-saved': runSaved,
  'run': run,
  'save': save,
}
