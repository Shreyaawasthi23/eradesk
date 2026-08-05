import { ObjectId } from 'mongodb'

// Resolves an incoming email's sender to a known client so the auto-reply
// can CC that client's Sales Team. Checks FrontClient/EndClient by exact
// contactEmail first, then falls back to a domain match (e.g. sender at
// someone@acme.com matches a client whose contactEmail is also @acme.com).
function domainOf(email) {
  const at = String(email || '').toLowerCase().split('@')[1]
  return at || ''
}

export async function findMatchingClient(db, senderEmail) {
  const email = String(senderEmail || '').toLowerCase().trim()
  if (!email) return null

  const emailRegex = new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')

  const endByEmail = await db.collection('EndClient').findOne({ contactEmail: emailRegex })
  if (endByEmail) return endByEmail

  const frontByEmail = await db.collection('FrontClient').findOne({ contactEmail: emailRegex })
  if (frontByEmail) return frontByEmail

  const domain = domainOf(email)
  if (!domain) return null

  const domainRegex = new RegExp(`@${domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')

  const endByDomain = await db.collection('EndClient').findOne({ contactEmail: domainRegex })
  if (endByDomain) return endByDomain

  const frontByDomain = await db.collection('FrontClient').findOne({ contactEmail: domainRegex })
  if (frontByDomain) return frontByDomain

  return null
}

export async function resolveSalesEmails(db, salesIds) {
  if (!Array.isArray(salesIds) || !salesIds.length) return []
  const ids = salesIds
    .map((id) => {
      try {
        return new ObjectId(id)
      } catch {
        return null
      }
    })
    .filter(Boolean)
  if (!ids.length) return []

  const sales = await db.collection('SalesTeam').find({ _id: { $in: ids } }).toArray()
  return sales.map((s) => s.email).filter(Boolean)
}
