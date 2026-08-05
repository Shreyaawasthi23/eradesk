import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

function isToday(date) {
  const d = new Date(date)
  const today = new Date()
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
}

function formatDate(date) {
  if (!date) return ''
  return new Date(date).toISOString().slice(0, 10)
}

const TREND_MONTHS = 6

function monthlyTrend(incidents) {
  const now = new Date()
  const buckets = []
  for (let i = TREND_MONTHS - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({ year: d.getFullYear(), month: d.getMonth(), count: 0 })
  }
  for (const incident of incidents) {
    const d = new Date(incident.createDate)
    const bucket = buckets.find((b) => b.year === d.getFullYear() && b.month === d.getMonth())
    if (bucket) bucket.count += 1
  }
  return buckets.map((b) => b.count)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { db } = auth

  const activeUserRoleId = new ObjectId('64410aa7bb5f311a20b39f3a')
  const users = await db
    .collection('Users')
    .find({ 'roles.$id': activeUserRoleId, status: true })
    .toArray()
  const singleRoleUsers = users.filter((u) => (u.roles || []).length === 1)

  const totalTickets = await db.collection('Incident').countDocuments({})

  const supportWorkingReports = []
  for (const user of singleRoleUsers) {
    const incidents = await db.collection('Incident').find({ userId: user._id.toString() }).toArray()

    const userTotalTickets = incidents.length
    const totalTicketsPercentage = totalTickets ? Math.round((userTotalTickets / totalTickets) * 1000) / 10 : 0

    const totalClosedTickets = incidents.filter((x) => x.status === 'CLOSED').length
    const totalClosedPercentage = userTotalTickets
      ? Math.round((totalClosedTickets / userTotalTickets) * 1000) / 10
      : 0

    const ticketsToday = incidents.filter((x) => isToday(x.createDate)).length

    supportWorkingReports.push({
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      userCreateDate: formatDate(user.createDate),
      totalTickets: userTotalTickets,
      totalTicketsPercentage,
      totalClosedTickets,
      totalClosedPercentage,
      ticketsToday,
      lastLogin: null,
      totalTrend: monthlyTrend(incidents),
      closedTrend: monthlyTrend(incidents.filter((x) => x.status === 'CLOSED')),
    })
  }

  supportWorkingReports.sort((a, b) => b.totalTickets - a.totalTickets)

  return res.status(200).json(supportWorkingReports)
}
