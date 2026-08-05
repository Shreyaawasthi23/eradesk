import { authenticate, hasAnyRole } from '@/lib/apiAuth'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const { db } = auth
  const currentYear = new Date().getFullYear()

  const results = await db
    .collection('PurchaseOrder')
    .aggregate([
      { $match: { poReceiveDate: { $regex: /^\d{4}-\d{2}/ } } },
      { $project: { year: { $toInt: { $substrCP: ['$poReceiveDate', 0, 4] } } } },
      { $group: { _id: '$year' } },
      { $sort: { _id: -1 } },
    ])
    .toArray()

  const years = results
    .map((r) => r._id)
    .filter((y) => y >= 2000 && y <= currentYear + 1)

  if (!years.includes(currentYear)) years.unshift(currentYear)

  return res.status(200).json(years)
}
