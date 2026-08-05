import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

const POINTS_BY_STATUS = {
  'PENDING FOR DOWNTIME': { points: 1, roles: null },
  'PENDING FOR LOGS': { points: 1, roles: ['ROLE_ENGINEER'] },
  'PENDING FOR RMA': { points: 1, roles: ['ROLE_ENGINEER'] },
  'PENDING FOR SPARE': { points: 1, roles: ['ROLE_USER'] },
  'SPARE IN TRANSIT': { points: 1, roles: ['ROLE_USER'] },
  'UNDER OBSERVATION': { points: 1, roles: ['ROLE_USER'] },
}

function userHasRole(roles, roleName) {
  return roles.includes(roleName)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER'])) {
    return res.status(403).end()
  }

  const { incidentId: id, status, userId, additionalDetails } = req.query
  const { db } = auth

  const incident = await db.collection('Incident').findOne({ _id: new ObjectId(id) })
  const user = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  if (!user || !incident) {
    return res.status(200).json({ statusCode: 409, message: 'Incident or User Not Found', additionInformation: '' })
  }

  const initialStatus = incident.status

  if (status === 'CLOSED') {
    const rmas = await db.collection('Rma').find({ incidentRefId: id }).toArray()
    for (const rma of rmas) {
      if (!['CLOSED', 'CANCELED', 'WAITING FOR FAULTY RETURN'].includes(rma.status)) {
        return res.status(200).json({
          statusCode: 409,
          message: `Incident can't be closed as #${rma.rmaId} is still ${rma.status}`,
          additionInformation: '',
        })
      }
    }
  }

  const now = new Date()
  const userRoleDocs = await db.collection('roles').find({}).toArray()
  const roleMap = new Map(userRoleDocs.map((r) => [r._id.toString(), r.name]))
  const currentUserRoles = (user.roles || []).map((r) => roleMap.get(r.oid?.toString())).filter(Boolean)

  await db.collection('Incident').updateOne(
    { _id: new ObjectId(id) },
    { $set: { status, modifyDate: now } },
  )

  await db.collection('IncidentNotes').insertOne({
    incidentId: id,
    note: `${user.email} changed incident status from ${initialStatus} to ${status}`,
    userId,
    userEmail: user.email,
    createDate: now,
    additionalDetails,
  })

  if (status === 'CLOSED') {
    if (userHasRole(currentUserRoles, 'ROLE_ADMIN') || userHasRole(currentUserRoles, 'ROLE_ENGINEER')) {
      await db.collection('UserPoints').insertOne({
        userId: user._id.toString(),
        points: 2,
        type: 'INCIDENT-UPDATE',
        remarks: `${user.email} earned 2 points for updating an Incident to CLOSED`,
        createDate: now,
      })
    }
  } else if (POINTS_BY_STATUS[status]) {
    const rule = POINTS_BY_STATUS[status]
    if (!rule.roles || rule.roles.some((r) => userHasRole(currentUserRoles, r))) {
      await db.collection('UserPoints').insertOne({
        userId: user._id.toString(),
        points: rule.points,
        type: 'INCIDENT-UPDATE',
        remarks: `${user.email} earned ${rule.points} points for updating an Incident to ${status}`,
        createDate: now,
      })
    }
  }

  await db.collection('SlaTracker').insertOne({
    incidentId: incident.incidentId,
    incidentRefId: id,
    status,
    createDate: now,
    userEmail: user.email,
    userId: user._id.toString(),
  })

  return res.status(200).json({ statusCode: 200, message: 'Status Updated Successfully', additionInformation: '' })
}
