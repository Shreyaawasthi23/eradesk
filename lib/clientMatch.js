import { ObjectId } from 'mongodb'

// Resolves an incoming email's sender to the Sales Team that should be
// CC'd on the auto-reply. Checks FrontClient/EndClient by exact
// contactEmail first, then falls back to a domain match (e.g. sender at
// someone@acme.com matches a client whose contactEmail is also @acme.com).
// If BOTH a FrontClient and an EndClient match at the same tier (exact or
// domain — this happens when a client's front and end contact are the
// same address), their Sales Teams are combined rather than only using
// whichever collection happens to be checked first, so adding a sales
// person to either record is enough for them to start receiving replies.
function domainOf(email) {
  const at = String(email || '').toLowerCase().split('@')[1]
  return at || ''
}

export async function findMatchingSalesIds(db, senderEmail) {
  const email = String(senderEmail || '').toLowerCase().trim()
  if (!email) return []

  const emailRegex = new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')

  const [endByEmail, frontByEmail] = await Promise.all([
    db.collection('EndClient').findOne({ contactEmail: emailRegex }),
    db.collection('FrontClient').findOne({ contactEmail: emailRegex }),
  ])

  if (endByEmail || frontByEmail) {
    return mergeSalesIds(endByEmail, frontByEmail)
  }

  const domain = domainOf(email)
  if (!domain) return []

  const domainRegex = new RegExp(`@${domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')

  const [endByDomain, frontByDomain] = await Promise.all([
    db.collection('EndClient').findOne({ contactEmail: domainRegex }),
    db.collection('FrontClient').findOne({ contactEmail: domainRegex }),
  ])

  return mergeSalesIds(endByDomain, frontByDomain)
}

function mergeSalesIds(...clients) {
  const ids = clients
    .filter(Boolean)
    .flatMap((c) => (Array.isArray(c.salesIds) ? c.salesIds : []))
  return Array.from(new Set(ids))
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
