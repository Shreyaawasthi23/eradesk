import { authenticate, hasAnyRole } from '@/lib/apiAuth'

function isToday(date) {
  const d = new Date(date)
  const today = new Date()
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
}

function round1(n) {
  return Math.round(n * 10) / 10
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
  const incidents = await db.collection('Incident').find({}).toArray()

  const totalIncidents = incidents.length
  const todayIncident = incidents.filter((x) => isToday(x.createDate)).length
  const openIncidents = incidents.filter((x) => x.status === 'OPEN').length
  const pendingForSpare = incidents.filter((x) => x.status === 'PENDING FOR SPARE').length
  const spareInTransit = incidents.filter((x) => x.status === 'SPARE IN TRANSIT').length

  const openPercentage = totalIncidents ? Math.round((openIncidents / totalIncidents) * 1000) / 10 : 0
  const pendingPercentage = totalIncidents ? Math.round((pendingForSpare / totalIncidents) * 1000) / 10 : 0
  const transitPercentage = totalIncidents ? Math.round((spareInTransit / totalIncidents) * 1000) / 10 : 0
  const todayPercentage = totalIncidents ? round1((todayIncident / totalIncidents) * 100) : 0

  return res.status(200).json({
    totalIncidents,
    todayIncident,
    openIncidents,
    pendingForSpare,
    spareInTransit,
    openPercentage,
    pendingPercentage,
    transitPercentage,
    todayPercentage,
  })
}
