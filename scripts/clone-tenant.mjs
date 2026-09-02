// Clones every collection from one tenant database to another within the same
// MongoDB cluster/connection. Used to seed a new deployment's database with a
// full copy of an existing tenant's data (e.g. lrs-eradesk -> lrs-eradesk-v3).
//
// Usage:
//   MONGODB_URI="mongodb+srv://..." node scripts/clone-tenant.mjs <sourceTenant> <destTenant>
//
// Safety:
//   - Refuses to run if source === destination.
//   - Refuses to overwrite a non-empty destination database unless --force is passed.
//   - Does not touch the source database (read-only there).
import { MongoClient } from 'mongodb'

const [, , sourceTenant, destTenant, ...rest] = process.argv
const force = rest.includes('--force')

if (!sourceTenant || !destTenant) {
  console.error('Usage: node scripts/clone-tenant.mjs <sourceTenant> <destTenant> [--force]')
  process.exit(1)
}
if (sourceTenant === destTenant) {
  console.error('Source and destination tenant must differ.')
  process.exit(1)
}

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const client = new MongoClient(uri)
await client.connect()

const sourceDb = client.db(sourceTenant)
const destDb = client.db(destTenant)

const existingDestCollections = await destDb.listCollections().toArray()
if (existingDestCollections.length > 0 && !force) {
  console.error(
    `Destination database "${destTenant}" already has ${existingDestCollections.length} collection(s). ` +
      `Re-run with --force to clone into it anyway (existing collections with the same name will be dropped first).`,
  )
  await client.close()
  process.exit(1)
}

const collections = await sourceDb.listCollections().toArray()
console.log(`Cloning ${collections.length} collection(s) from "${sourceTenant}" to "${destTenant}"...`)

for (const { name } of collections) {
  const sourceCol = sourceDb.collection(name)
  const destCol = destDb.collection(name)

  if (force) {
    await destCol.drop().catch(() => {})
  }

  const docs = await sourceCol.find({}).toArray()
  if (docs.length > 0) {
    // insertMany in batches to avoid oversized single requests on large collections
    const BATCH = 1000
    for (let i = 0; i < docs.length; i += BATCH) {
      await destCol.insertMany(docs.slice(i, i + BATCH), { ordered: false })
    }
  }

  const indexes = await sourceCol.indexes()
  for (const idx of indexes) {
    if (idx.name === '_id_') continue
    const { key, name: idxName, unique, sparse } = idx
    const options = { name: idxName }
    if (unique) options.unique = true
    if (sparse) options.sparse = true
    await destCol.createIndex(key, options).catch((e) => {
      console.warn(`  Warning: could not recreate index "${idxName}" on "${name}": ${e.message}`)
    })
  }

  console.log(`  ${name}: ${docs.length} document(s)`)
}

console.log('Done.')
await client.close()
