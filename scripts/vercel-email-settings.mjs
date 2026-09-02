// Check or toggle EmailSettings.enabled / autoReplyEnabled on the Vercel (Atlas) database.
//
// Usage:
//   MONGODB_URI="mongodb+srv://...">  node scripts/vercel-email-settings.mjs check
//   MONGODB_URI="mongodb+srv://...">  node scripts/vercel-email-settings.mjs off
//   MONGODB_URI="mongodb+srv://...">  node scripts/vercel-email-settings.mjs on
//
// Reads the connection string from MONGODB_URI env var (the same value used in Vercel) so the
// Atlas credentials never need to be written into a file.

import dns from 'node:dns'
import { MongoClient } from 'mongodb'

// Node's DNS resolver on this machine fails to resolve mongodb+srv:// SRV records
// (ECONNREFUSED) even though the OS resolver works fine — force public DNS as a workaround.
dns.setServers(['8.8.8.8', '1.1.1.1'])

const DB_NAME = 'lrs-eradesk-vercel'
const action = process.argv[2]

if (!['check', 'off', 'on'].includes(action)) {
  console.error('Usage: MONGODB_URI="..." node scripts/vercel-email-settings.mjs <check|off|on>')
  process.exit(1)
}

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('MONGODB_URI env var is required')
  process.exit(1)
}

const client = new MongoClient(uri)

try {
  await client.connect()
  const db = client.db(DB_NAME)
  const collection = db.collection('EmailSettings')

  if (action === 'check') {
    const settings = await collection.findOne({})
    if (!settings) {
      console.log('No EmailSettings document found — mail flow is effectively off (nothing configured).')
    } else {
      console.log('enabled:', settings.enabled ?? false)
      console.log('autoReplyEnabled:', settings.autoReplyEnabled ?? false)
    }
  } else {
    const enabled = action === 'on'
    const result = await collection.updateOne(
      {},
      { $set: { enabled, autoReplyEnabled: enabled, modifyDate: new Date() } },
      { upsert: true },
    )
    console.log(`Set enabled=${enabled}, autoReplyEnabled=${enabled}.`, result.upsertedId ? '(created new settings doc)' : '(updated existing doc)')
  }
} finally {
  await client.close()
}
