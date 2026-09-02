import dns from 'node:dns'
dns.setServers(['8.8.8.8', '1.1.1.1'])
import { MongoClient } from 'mongodb'

const uriBase = process.env.MONGODB_URI
const badUri = `${uriBase}/lrs-eradesk-vercel`

console.log('Bad URI (old code path):', badUri.replace(/:[^:@]+@/, ':****@'))

const client = new MongoClient(badUri)
try {
  await client.connect()
  console.log('OLD construction: CONNECTED (unexpected!)')
  await client.close()
} catch (e) {
  console.log('OLD construction: FAILED as expected ->', e.message)
}
