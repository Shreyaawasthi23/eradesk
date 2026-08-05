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
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { db } = auth
  const requestedYear = Number(req.query.year)
  const targetYear = Number.isInteger(requestedYear) ? requestedYear : new Date().getFullYear()

  const results = await db
    .collection('Incident')
    .aggregate([
      {
        $match: {
          createDate: {
            $gte: new Date(Date.UTC(targetYear, 0, 1)),
            $lt: new Date(Date.UTC(targetYear + 1, 0, 1)),
          },
        },
      },
      { $project: { month: { $month: '$createDate' } } },
      { $group: { _id: '$month', count: { $sum: 1 } } },
    ])
    .toArray()

  const response = {}
  MONTH_NAMES.forEach((m) => (response[m] = 0))
  for (const row of results) {
    if (row._id >= 1 && row._id <= 12) response[MONTH_NAMES[row._id - 1]] = row.count
  }

  return res.status(200).json(response)
}
