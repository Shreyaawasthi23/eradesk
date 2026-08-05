import { authenticate, hasAnyRole } from '@/lib/apiAuth'

// NOTE: mirrors Java's MicrosoftServiceImplementation.fetchEmailByIncidentId(), which calls the
// Graph API with a long-lived access token hardcoded in application.properties rather than a
// real OAuth refresh flow. That token is expired (exp: 2023-10-13), so this endpoint is already
// non-functional in the source backend today — ported as-is for behavior parity, not fixed here.
const ACCESS_TOKEN =
  process.env.MS_GRAPH_ACCESS_TOKEN ||
  'eyJ0eXAiOiJKV1QiLCJub25jZSI6ImtIaDhJR0trNkRJRE9GaGhqZU9BUVBlZ3hrSGRDZEdIamxZMDNuRUJUVHciLCJhbGciOiJSUzI1NiIsIng1dCI6IjlHbW55RlBraGMzaE91UjIybXZTdmduTG83WSIsImtpZCI6IjlHbW55RlBraGMzaE91UjIybXZTdmduTG83WSJ9.eyJhdWQiOiIwMDAwMDAwMy0wMDAwLTAwMDAtYzAwMC0wMDAwMDAwMDAwMDAiLCJpc3MiOiJodHRwczovL3N0cy53aW5kb3dzLm5ldC80MjMyYzE0OS1jNzVjLTQ5NzctOTZhZi1lYWRjNzMzMTFjY2UvIiwiaWF0IjoxNjk3MDc5ODQ1LCJuYmYiOjE2OTcwNzk4NDUsImV4cCI6MTY5NzE2NjU0NSwiYWNjdCI6MCwiYWNyIjoiMSIsImFpbyI6IkFUUUF5LzhVQUFBQStNNWo0TkIzRjdoYnAwUkUwcXZVOVRVbFU3SXFHKzFBQkJGV3l5MjJVNk11TjljbmZyR0ptcnp6K2JqKzVxY1UiLCJhbXIiOlsicHdkIl0sImFwcF9kaXNwbGF5bmFtZSI6IkdyYXBoIEV4cGxvcmVyIiwiYXBwaWQiOiJkZThiYzhiNS1kOWY5LTQ4YjEtYThhZC1iNzQ4ZGE3MjUwNjQiLCJhcHBpZGFjciI6IjAiLCJmYW1pbHlfbmFtZSI6IlN1cHBvcnQiLCJnaXZlbl9uYW1lIjoiTFJTIiwiaWR0eXAiOiJ1c2VyIiwiaXBhZGRyIjoiMTIyLjE2MS41MS4xMTEiLCJuYW1lIjoiTFJTIFN1cHBvcnQiLCJvaWQiOiIwOGEwZGY4MS0zODBmLTRmYTUtYTVjOS0yYzkzMDgzNzJmMDciLCJwbGF0ZiI6IjgiLCJwdWlkIjoiMTAwMzIwMDBFMUQ0NDlDMSIsInJoIjoiMC5BU29BU2NFeVFsekhkMG1Xci1yY2N6RWN6Z01BQUFBQUFBQUF3QUFBQUFBQUFBQXFBRkEuIiwic2NwIjoiTWFpbC5SZWFkIG9wZW5pZCBwcm9maWxlIFVzZXIuUmVhZCBlbWFpbCIsInNpZ25pbl9zdGF0ZSI6WyJrbXNpIl0sInN1YiI6IkJxZkxiSGh6SE05M3RUeEJjVkJHcDRNeHlySVdFSnRHcnpmQmNlZGpKVjQiLCJ0ZW5hbnRfcmVnaW9uX3Njb3BlIjoiQVMiLCJ0aWQiOiI0MjMyYzE0OS1jNzVjLTQ5NzctOTZhZi1lYWRjNzMzMTFjY2UiLCJ1bmlxdWVfbmFtZSI6IlN1cHBvcnRAbHJzc2VydmljZXMuaW4iLCJ1cG4iOiJTdXBwb3J0QGxyc3NlcnZpY2VzLmluIiwidXRpIjoiMjhQTll3TlVvMDJQZksydTRWOVFBQSIsInZlciI6IjEuMCIsIndpZHMiOlsiYjc5ZmJmNGQtM2VmOS00Njg5LTgxNDMtNzZiMTk0ZTg1NTA5Il0sInhtc19jYyI6WyJDUDEiXSwieG1zX3NzbSI6IjEiLCJ4bXNfc3QiOnsic3ViIjoibm1ONjJUemtnbTVzbzBTS0JOMjhFdTJ2b3FUd09NQTJXMWUwZkdfWW8wQSJ9LCJ4bXNfdGNkdCI6MTUyMjY1NzkyMX0.VH_l7bN-3br_AsYwtFDMfKid_bCPV1KQXfe4eCV7PtS4mLXlr6yORegMcUARyKGnnU50ADRbDpecc-E-P1ri0u8_a2JFuGBu6Tlzo5uh2_A-lVTuDjuTTgCeFaD-HyvOCCUG0n6vX5UhqaXwju5FJmqjxS_U6cr7q6r1biU4pzR-hVkGUXQOX39rm5RD9MU0yVgsRGNqHNstbacP3TSBM_AckS6MePt1f3me9a9pYp4Du528_wqIW0XjSkcH3rw0r95uPL17zNStvAX7J3hT4ZgUpSSHpCQUzOg8bAmqBRDfX-uH28TBtVrAC3Fyw7cozEJz3sZSRLfn0mt2slcoDQ'

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
