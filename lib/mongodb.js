import { MongoClient } from 'mongodb'

const uriBase = process.env.MONGODB_URI || 'mongodb://localhost:27017'

const clientCache = global._mongoClients || (global._mongoClients = new Map())

export function getTenantDb(tenant) {
  if (!tenant) throw new Error('Tenant is required')

  if (!clientCache.has(tenant)) {
    const client = new MongoClient(`${uriBase}/${tenant}`)
    clientCache.set(tenant, client.connect().then(() => client.db(tenant)))
  }

  return clientCache.get(tenant)
}
