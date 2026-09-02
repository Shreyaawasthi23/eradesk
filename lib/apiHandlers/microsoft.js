import { authenticate, hasAnyRole } from '@/lib/apiAuth'

// NOTE: mirrors Java's MicrosoftServiceImplementation.fetchEmailByIncidentId(), which calls the
// Graph API with a long-lived access token hardcoded in application.properties rather than a
// real OAuth refresh flow. That approach is not reproduced here — set MS_GRAPH_ACCESS_TOKEN if
// this endpoint needs to be used; without it, requests below fail with a clear auth error.
const ACCESS_TOKEN = process.env.MS_GRAPH_ACCESS_TOKEN || ''

async function fetchMailDetailsAndSave(db, id, incident) {
  const response = await fetch(`https://graph.microsoft.com/v1.0/me/messages/${id}`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  })
  if (!response.ok) return false

  const mail = await response.json()
  mail.incidentId = incident.incidentId
  mail.incidentRefId = incident._id.toString()
  mail.createDate = new Date()

  const subject = mail.subject || ''
  if (subject.includes('undelivered') || subject.includes('not found')) return false

  await db.collection('Mails').insertOne(mail)
  return true
}

function removeDuplicateMails(values) {
  const seen = new Set()
  const filtered = []
  for (const email of values || []) {
    if (!seen.has(email.bodyPreview)) {
      seen.add(email.bodyPreview)
      filtered.push(email)
    }
  }
  return filtered
}

async function fetchMails(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR'])) return res.status(403).end()

  const { incidentId } = req.query
  const { db } = auth

  const incident = await db.collection('Incident').findOne({ incidentId })
  if (!incident) {
    return res.status(200).json({ statusCode: 409, message: 'Incident Not Found' })
  }

  const searchUrl = new URL('https://graph.microsoft.com/v1.0/me/messages')
  searchUrl.searchParams.set('$filter', `contains(subject,'${incidentId}')`)

  const listResponse = await fetch(searchUrl, { headers: { Authorization: `Bearer ${ACCESS_TOKEN}` } })
  if (!listResponse.ok) {
    return res.status(200).json({ statusCode: 500, message: `Graph API error: ${listResponse.status}` })
  }

  const listData = await listResponse.json()
  const filteredValues = removeDuplicateMails(listData.value)
  const ids = filteredValues.map((v) => v.id)

  let savedMails = 0
  let unsavedMails = 0
  for (const id of ids) {
    const saved = await fetchMailDetailsAndSave(db, id, incident)
    if (saved) savedMails++
    else unsavedMails++
  }

  return res.status(200).json({
    statusCode: 200,
    message: `Mail Fetch Successfully for Incident - ${incidentId} Total Mails - ${ids.length} Saved Mails - ${savedMails} Unsaved Mails - ${unsavedMails}`,
  })
}

export default {
  'fetch-mails': fetchMails,
}
