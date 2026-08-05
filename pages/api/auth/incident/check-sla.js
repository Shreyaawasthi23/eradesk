import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

// Mirrors IncidentServiceImplementation.calculateSla(): sums duration between status transitions,
// pausing accumulation while in PENDING FOR LOGS / PENDING TO CLIENT.
function calculateSlaMinutes(trackingRecords) {
  let startTime = null
  let pauseTime = null
  let lastStatusTime = null
  let totalDurationMillis = 0
  let isClosed = false
  let isPaused = false
  let closeDate = null

  for (const record of trackingRecords) {
    const recordTime = new Date(record.createDate)

    if (record.status === 'OPEN') {
      if (startTime === null) startTime = recordTime
    } else if (record.status === 'CLOSED' || record.status === 'PENDING FOR RMA CLOSURE') {
      if (startTime !== null && !isPaused) {
        totalDurationMillis += recordTime.getTime() - lastStatusTime.getTime()
      }
      isClosed = true
      startTime = null
      if (record.status === 'CLOSED' && !closeDate) closeDate = recordTime
    } else if (record.status === 'PENDING FOR LOGS' || record.status === 'PENDING TO CLIENT') {
      if (startTime !== null && !isPaused && pauseTime === null) {
        pauseTime = recordTime
        totalDurationMillis = lastStatusTime ? recordTime.getTime() - startTime.getTime() : 0
        isPaused = true
      } else {
        totalDurationMillis += lastStatusTime ? recordTime.getTime() - lastStatusTime.getTime() : 0
        pauseTime = recordTime
        isPaused = true
      }
    } else {
      if (isPaused) {
        isPaused = false
      } else {
        totalDurationMillis += lastStatusTime ? recordTime.getTime() - lastStatusTime.getTime() : 0
      }
    }
    lastStatusTime = recordTime
  }

  if (!isClosed && startTime !== null && !isPaused) {
    totalDurationMillis += Date.now() - lastStatusTime.getTime()
  }

  const totalDurationMinutes = Math.floor(totalDurationMillis / 60000)
  const hours = Math.floor(totalDurationMinutes / 60)
  const minutes = totalDurationMinutes % 60

  return { slaTime: `${hours}hr ${minutes}min`, closeDate }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { incidentId } = req.query
  const { db } = auth

  const trackingRecords = await db.collection('SlaTracker').find({ incidentRefId: incidentId }).toArray()
  const { slaTime, closeDate } = calculateSlaMinutes(trackingRecords)

  const incident = await db.collection('Incident').findOne({ _id: new ObjectId(incidentId) })
  const update = { slaTime }
  if (!incident.closeDate && closeDate) {
    update.closeDate = closeDate
  }

  await db.collection('Incident').updateOne({ _id: new ObjectId(incidentId) }, { $set: update })

  return res.status(200).json(true)
}
