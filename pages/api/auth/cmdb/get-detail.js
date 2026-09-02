import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import {
  serializeConfigurationItem,
  serializeAsset,
  serializeIncident,
  serializeProblem,
  serializeChange,
} from '@/lib/serializers'

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

  const { id } = req.query
  const { db } = auth

  const ci = await db.collection('ConfigurationItem').findOne({ _id: new ObjectId(id) })
  if (!ci) {
    return res.status(404).json({ statusCode: 404, message: 'Configuration Item not found' })
  }

  const [asset, linkedIncidents, linkedProblems, linkedChanges] = await Promise.all([
    ci.assetId ? db.collection('Assets').findOne({ _id: new ObjectId(ci.assetId) }) : Promise.resolve(null),
    db.collection('Incident').find({ linkedCIIds: id }).toArray(),
    db.collection('Problem').find({ linkedCIIds: id }).toArray(),
    db.collection('Change').find({ linkedCIIds: id }).toArray(),
  ])

  return res.status(200).json({
    ...serializeConfigurationItem(ci),
    asset: asset ? serializeAsset(asset) : null,
    linkedIncidents: linkedIncidents.map(serializeIncident),
    linkedProblems: linkedProblems.map(serializeProblem),
    linkedChanges: linkedChanges.map(serializeChange),
  })
}
