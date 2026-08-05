import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.join(__dirname, '..', '.env.local') })

const { listUnreadIncomingMessages } = await import('../lib/gmail.js')

const messages = await listUnreadIncomingMessages()
console.log(`Matched ${messages.length} message(s) with exact marker "${process.env.MAIL_SUBJECT_MARKER || '[Support]'}":`)
messages.forEach((m) => console.log(` - "${m.subject}" from ${m.senderEmail}`))
