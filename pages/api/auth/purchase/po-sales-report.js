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
  const requestedYear = Number(req.query.year)
  const targetYear = Number.isInteger(requestedYear) ? requestedYear : new Date().getFullYear()
  const requestedCompareYear = Number(req.query.compareYear)
  const compareYear = Number.isInteger(requestedCompareYear)
    ? requestedCompareYear
    : targetYear - 1

  const salesTeam = await db.collection('SalesTeam').find({}).toArray()

  const salesReportList = []
  for (const person of salesTeam) {
    const purchaseOrders = await db
      .collection('PurchaseOrder')
      .find({ salesId: person._id.toString() })
      .toArray()

    let currentYearCost = 0
    let lastYearCost = 0
    for (const po of purchaseOrders) {
      if (!po.poReceiveDate) continue
      const year = Number(po.poReceiveDate.split('-')[0])
      if (year === targetYear) currentYearCost += po.value || 0
      else if (year === compareYear) lastYearCost += po.value || 0
    }

    salesReportList.push({ name: person.name, currentYearCost, lastYearCost })
  }

  return res.status(200).json(salesReportList)
}
