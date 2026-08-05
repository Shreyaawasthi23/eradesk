import { google } from 'googleapis'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.join(__dirname, '..', '.env.local') })

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
)
oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN })
const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

async function listWithQuery(label, q) {
  const list = await gmail.users.messages.list({ userId: 'me', q, maxResults: 10 })
  console.log(`\n[${label}] query="${q}" -> ${list.data.resultSizeEstimate ?? 0} result(s)`)
  for (const m of list.data.messages || []) {
    const full = await gmail.users.messages.get({ userId: 'me', id: m.id, format: 'metadata', metadataHeaders: ['Subject', 'From', 'Date'] })
    const headers = full.data.payload?.headers || []
    const get = (n) => headers.find((h) => h.name.toLowerCase() === n.toLowerCase())?.value || ''
    console.log(`  - id=${m.id} labelIds=${full.data.labelIds?.join(',')} from="${get('From')}" subject="${get('Subject')}" date="${get('Date')}"`)
  }
}

await listWithQuery('all unread anywhere', 'is:unread')
await listWithQuery('unread in inbox', 'is:unread in:inbox')
await listWithQuery('unread in inbox not from me', 'is:unread in:inbox -from:me')
await listWithQuery('unread with [Support] subject', 'is:unread in:inbox -from:me subject:"[Support]"')
await listWithQuery('any mail with Support in subject', 'subject:Support')

const profile = await gmail.users.getProfile({ userId: 'me' })
console.log('\nAuthenticated as:', profile.data.emailAddress)
