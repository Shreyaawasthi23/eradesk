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
  const purchaseOrders = await db.collection('PurchaseOrder').find({ status: true }).toArray()

  const requestedYear = Number(req.query.year)
  const targetYear = Number.isInteger(requestedYear) ? requestedYear : new Date().getFullYear()
  const counts = {}

  for (const po of purchaseOrders) {
    if (!po.poReceiveDate) continue
    const [yearStr, monthStr] = po.poReceiveDate.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)
    if (year !== targetYear || !month || month < 1 || month > 12) continue
    const key = MONTH_NAMES[month - 1]
    counts[key] = (counts[key] || 0) + 1
  }

  const response = {}
  MONTH_NAMES.forEach((m) => (response[m] = counts[m] || 0))
  return res.status(200).json(response)
}
