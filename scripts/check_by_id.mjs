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

const ids = ['220726LRSI01', '220726LRSI02', '220726LRSI03']
const found = await db.collection('Incident').find({ incidentId: { $in: ids } }).toArray()
console.log(`Found ${found.length} matching incidents:\n`)
found.forEach((i) => {
  console.log(`${i.incidentId} | source=${i.source} | contactName=${i.contactName} | createDate=${i.createDate}`)
})

const allDbs = await client.db().admin().listDatabases()
console.log('\nAvailable databases:', allDbs.databases.map((d) => d.name).join(', '))

await client.close()
