// Translates a query-builder spec (data source + filters + grouping + sorting) into a MongoDB
// query, for the ad-hoc report builder (spec section 46). Kept as a pure function (returns a
// Mongo filter/pipeline description; doesn't touch the DB) so it's independently testable, and
// deliberately allowlists both the data source and the fields that can be filtered/grouped/sorted
// on, since this endpoint accepts arbitrary user input describing a database query — an
// unrestricted version of this would let a user probe or dump any collection.

export const DATA_SOURCES = {
  Incident: {
    collection: 'Incident',
    fields: ['incidentId', 'problem', 'priority', 'status', 'engineerId', 'createDate', 'closeDate', 'serialNumber'],
  },
  Problem: {
    collection: 'Problem',
    fields: ['problemId', 'title', 'priority', 'status', 'engineerId', 'createDate', 'closeDate'],
  },
  Change: {
    collection: 'Change',
    fields: ['changeId', 'title', 'type', 'priority', 'status', 'createDate', 'closeDate'],
  },
  Asset: {
    collection: 'Assets',
    fields: ['assetId', 'make', 'model', 'serialNumber', 'assetType', 'createDate'],
  },
  Contract: {
    collection: 'Contract',
    fields: ['contractId', 'vendorName', 'type', 'status', 'cost', 'startDate', 'endDate'],
  },
  PurchaseOrder: {
    collection: 'PurchaseOrder',
    fields: ['purchaseOrderNumber', 'type', 'status', 'value', 'createDate'],
  },
}

const OPERATORS = {
  EQUALS: (field, value) => ({ [field]: value }),
  NOT_EQUALS: (field, value) => ({ [field]: { $ne: value } }),
  CONTAINS: (field, value) => ({ [field]: { $regex: escapeRegex(value), $options: 'i' } }),
  GREATER_THAN: (field, value) => ({ [field]: { $gt: coerceComparable(value) } }),
  LESS_THAN: (field, value) => ({ [field]: { $lt: coerceComparable(value) } }),
  BETWEEN: (field, value) => ({ [field]: { $gte: coerceComparable(value[0]), $lte: coerceComparable(value[1]) } }),
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Filter values may represent dates (ISO strings) or numbers; try both so range/comparison
// operators work on either without the caller having to specify a type.
function coerceComparable(value) {
  if (typeof value === 'number') return value
  const asDate = new Date(value)
  if (!Number.isNaN(asDate.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(String(value))) return asDate
  const asNumber = Number(value)
  return Number.isNaN(asNumber) ? value : asNumber
}

export class ReportQueryError extends Error {}

// Returns { collection, mongoFilter, sortField } or throws ReportQueryError with a
// caller-safe message — never lets an unrecognized dataSource/field/operator through.
export function buildReportQuery({ dataSource, filters, sortBy, sortDirection }) {
  const source = DATA_SOURCES[dataSource]
  if (!source) throw new ReportQueryError(`Unknown data source: ${dataSource}`)

  const clauses = []
  for (const f of filters || []) {
    if (!source.fields.includes(f.field)) {
      throw new ReportQueryError(`Field "${f.field}" is not filterable on ${dataSource}`)
    }
    const build = OPERATORS[f.operator]
    if (!build) throw new ReportQueryError(`Unknown operator: ${f.operator}`)
    clauses.push(build(f.field, f.value))
  }

  const mongoFilter = clauses.length ? { $and: clauses } : {}

  let sortField = null
  if (sortBy) {
    if (!source.fields.includes(sortBy)) {
      throw new ReportQueryError(`Field "${sortBy}" is not sortable on ${dataSource}`)
    }
    sortField = { [sortBy]: sortDirection === 'DESC' ? -1 : 1 }
  }

  return { collection: source.collection, mongoFilter, sortField }
}

// Groups an already-fetched row set by a field (in-memory — the row counts these reports deal
// with are small enough that a Mongo $group aggregation isn't needed, and this keeps the
// collection-agnostic field validation above as the single source of truth for what's queryable).
export function groupRows(rows, groupByField) {
  if (!groupByField) return null
  const groups = new Map()
  for (const row of rows) {
    const key = row[groupByField] ?? '(none)'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }
  return [...groups.entries()].map(([key, items]) => ({ key, count: items.length }))
}
