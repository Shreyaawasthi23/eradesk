import { MongoClient } from 'mongodb'

const uriBase = process.env.MONGODB_URI || 'mongodb://localhost:27017'

const clientCache = global._mongoClients || (global._mongoClients = new Map())

// The tenant is only used to select the database via client.db(tenant) — the connection URI
// itself must stay untouched (inserting a path segment before the query string would require
// fragile string surgery, and any trailing options like ?appName=... would end up on the wrong
// side of it).
function getClient() {
  if (!clientCache.has('__client__')) {
    const client = new MongoClient(uriBase)
    clientCache.set('__client__', client.connect().then(() => client))
  }
  return clientCache.get('__client__')
}

export async function getTenantDb(tenant) {
  if (!tenant) throw new Error('Tenant is required')

  const client = await getClient()
  return client.db(tenant)
}
