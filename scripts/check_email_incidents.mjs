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

const emailIncidents = await db.collection('Incident').find({ source: 'EMAIL' }).toArray()
console.log(`Found ${emailIncidents.length} email-sourced incidents:\n`)
emailIncidents.forEach((i) => {
  console.log(JSON.stringify(i, null, 2))
  console.log('---')
})

await client.close()
