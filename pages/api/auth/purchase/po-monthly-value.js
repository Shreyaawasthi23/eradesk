import { authenticate, hasAnyRole } from '@/lib/apiAuth'

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const { db } = auth
  const requestedYear = Number(req.query.year)
  const targetYear = Number.isInteger(requestedYear) ? requestedYear : new Date().getFullYear()

  const results = await db
    .collection('PurchaseOrder')
    .aggregate([
      { $match: { poReceiveDate: { $exists: true } } },
      {
        $project: {
          monthYear: { $substrCP: ['$poReceiveDate', 0, 7] },
          value: 1,
        },
      },
      { $group: { _id: '$monthYear', totalValue: { $sum: '$value' } } },
      { $sort: { _id: 1 } },
    ])
    .toArray()

  const response = {}
  MONTH_NAMES.forEach((m) => (response[m] = 0))

  for (const row of results) {
    const [yearStr, monthStr] = String(row._id).split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)
    if (year === targetYear && month >= 1 && month <= 12) {
      response[MONTH_NAMES[month - 1]] = row.totalValue || 0
    }
  }

  return res.status(200).json(response)
}
