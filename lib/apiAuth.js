import jwt from 'jsonwebtoken'
import { getTenantDb } from '@/lib/mongodb'

const JWT_SECRET = process.env.JWT_SECRET || 'lrs-era-desk'

// Verifies X-Tenant + Bearer token like Spring's TenantFilter + JwtUtils/UserDetailsServiceImpl,
// then loads the user's roles so callers can replicate @PreAuthorize checks.
export async function authenticate(req, res) {
  const tenant = req.headers['x-tenant']
  if (!tenant) {
    res.status(401).end()
    return null
  }

  const authHeader = req.headers['authorization'] || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    res.status(401).end()
    return null
  }

  let payload
  try {
    payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS512'] })
  } catch {
    res.status(401).end()
    return null
  }

  const db = await getTenantDb(tenant)
  const user = await db.collection('Users').findOne({ email: payload.sub })
  if (!user) {
    res.status(401).end()
    return null
  }

  const roles = []
  if (user.roles && user.roles.length) {
    const roleIds = user.roles.map((r) => r.$id || r.oid)
    const roleDocs = await db.collection('roles').find({ _id: { $in: roleIds } }).toArray()
    roleDocs.forEach((r) => roles.push(r.name))
  }

  return { db, tenant, user, roles }
}

export function hasAnyRole(roles, allowed) {
  return roles.some((r) => allowed.includes(r))
}

export async function getRoleMap(db) {
  const allRoles = await db.collection('roles').find({}).toArray()
  return new Map(allRoles.map((r) => [r._id.toString(), r.name]))
}

export function resolveUserRoles(user, roleMap) {
  return (user.roles || []).map((r) => {
    const idStr = (r.$id || r.oid)?.toString()
    return { id: idStr, name: roleMap.get(idStr) }
  })
}
