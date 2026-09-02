import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { serializeVendor } from '@/lib/serializers'

// Unpaginated list for dropdown pickers (contract creation, etc), mirroring
// sales-team/get-all-list.js's convention.
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

  const { db } = auth
  const vendors = await db.collection('Vendor').find({ status: true }).sort({ name: 1 }).toArray()

  return res.status(200).json(vendors.map(serializeVendor))
}
