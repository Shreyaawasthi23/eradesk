// One-off cleanup: remove incidents created by the email poller test run
// (tagged source: 'EMAIL') along with their SlaTracker rows.
import { MongoClient } from 'mongodb'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.join(__dirname, '..', '.env.local') })

const uriBase = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const tenant = process.env.NEXT_PUBLIC_TENANT

const client = new MongoClient(`${uriBase}/${tenant}`)
await client.connect()
const db = client.db(tenant)

const toDelete = await db.collection('Incident').find({ source: 'EMAIL' }).toArray()
console.log(`Found ${toDelete.length} email-sourced incidents:`)
toDelete.forEach((i) => console.log(` - ${i.incidentId} (${i.contactName})`))

const incidentIds = toDelete.map((i) => i.incidentId)

const incidentResult = await db.collection('Incident').deleteMany({ source: 'EMAIL' })
const slaResult = await db.collection('SlaTracker').deleteMany({ incidentId: { $in: incidentIds } })

console.log(`Deleted ${incidentResult.deletedCount} incidents, ${slaResult.deletedCount} SLA tracker rows.`)

await client.close()
