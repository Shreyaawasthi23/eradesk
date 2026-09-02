// Adds volume + variety on top of seed-demo-data.mjs so every module's list view, filter, and
// chart has enough realistic data to actually look populated in the UI — not just enough to
// prove the API works. Safe to re-run: everything here is tagged so a second run skips instead
// of duplicating. Run seed-demo-data.mjs first (this script assumes the demo users/roles exist).
import { MongoClient } from 'mongodb'

const TENANT = 'lrs-eradesk-v3'
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const client = new MongoClient(uri)
await client.connect()
const db = client.db(TENANT)
console.log(`Connected to tenant "${TENANT}"`)

const now = new Date()
const daysAgo = (n) => new Date(now.getTime() - n * 86400000)
const daysFromNow = (n) => new Date(now.getTime() + n * 86400000)
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

async function nextSeq(collection, seqName) {
  const doc = await db
    .collection(collection)
    .findOneAndUpdate({ _id: seqName }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' })
  return doc && typeof doc.seq === 'number' ? doc.seq : 1
}

const adminUser = await db.collection('Users').findOne({ email: 'demo.admin@eradesk-test.local' })
const managerUser = await db.collection('Users').findOne({ email: 'demo.manager@eradesk-test.local' })
const engineerUser = await db.collection('Users').findOne({ email: 'demo.engineer@eradesk-test.local' })
if (!adminUser || !managerUser || !engineerUser) {
  throw new Error('Demo users not found — run seed-demo-data.mjs first')
}

// ---------- Extra Incidents (base for extra Problems/CMDB links, and dashboard chart variety) ----------
const incidentSeeds = [
  { id: 'DEMO-INC-010', problem: 'Email delivery delayed for external domains', priority: 3, status: 'CLOSED', daysAgo: 25 },
  { id: 'DEMO-INC-011', problem: 'Wi-Fi drops in the east wing conference rooms', priority: 4, status: 'CLOSED', daysAgo: 22 },
  { id: 'DEMO-INC-012', problem: 'Shared drive permissions reset unexpectedly', priority: 2, status: 'CLOSED', daysAgo: 18 },
  { id: 'DEMO-INC-013', problem: 'Backup job failed for finance database', priority: 1, status: 'CLOSED', daysAgo: 15 },
  { id: 'DEMO-INC-014', problem: 'Printer queue stuck on 3rd floor', priority: 5, status: 'CLOSED', daysAgo: 14 },
  { id: 'DEMO-INC-015', problem: 'SSO login loop for new hires', priority: 2, status: 'CLOSED', daysAgo: 11 },
  { id: 'DEMO-INC-016', problem: 'Slack integration webhook failing silently', priority: 3, status: 'CLOSED', daysAgo: 9 },
  { id: 'DEMO-INC-017', problem: 'Laptop battery drains overnight (fleet-wide)', priority: 4, status: 'OPEN', daysAgo: 4 },
  { id: 'DEMO-INC-018', problem: 'CRM export times out for large accounts', priority: 2, status: 'OPEN', daysAgo: 3 },
  { id: 'DEMO-INC-019', problem: 'Video conferencing audio echo in Room B', priority: 4, status: 'OPEN', daysAgo: 2 },
  { id: 'DEMO-INC-020', problem: 'Firewall rule blocking vendor API calls', priority: 1, status: 'OPEN', daysAgo: 1 },
]
const incidentIdByLabel = {}
for (const seed of incidentSeeds) {
  const existing = await db.collection('Incident').findOne({ incidentId: seed.id })
  if (existing) {
    incidentIdByLabel[seed.id] = existing._id
    continue
  }
  const result = await db.collection('Incident').insertOne({
    incidentId: seed.id,
    incidentDate: daysAgo(seed.daysAgo),
    problem: seed.problem,
    priority: seed.priority,
    status: seed.status,
    engineerId: engineerUser._id.toString(),
    createDate: daysAgo(seed.daysAgo),
    modifyDate: seed.status === 'CLOSED' ? daysAgo(Math.max(0, seed.daysAgo - 1)) : daysAgo(seed.daysAgo),
    closeDate: seed.status === 'CLOSED' ? daysAgo(Math.max(0, seed.daysAgo - 1)) : null,
    userId: adminUser._id.toString(),
    userEmail: adminUser.email,
  })
  incidentIdByLabel[seed.id] = result.insertedId
}
console.log(`Incidents: +${incidentSeeds.length} (mix of OPEN/CLOSED, P1-P5)`)

// ---------- Extra Knowledge Base articles ----------
const kbSeeds = [
  { title: 'Resetting a forgotten Active Directory password', category: 'Access', tags: ['password', 'ad', 'access'], status: 'PUBLISHED' },
  { title: 'Setting up email on a new phone', category: 'Email', tags: ['email', 'mobile'], status: 'PUBLISHED' },
  { title: 'Requesting elevated software install permissions', category: 'Software', tags: ['software', 'permissions'], status: 'PUBLISHED' },
  { title: 'Printer setup for remote workers', category: 'Hardware', tags: ['printer', 'remote'], status: 'PUBLISHED' },
  { title: 'Understanding your monthly IT service report', category: 'General', tags: ['reporting'], status: 'DRAFT' },
  { title: 'Known issue: Slack notifications delayed on VPN', category: 'Network', tags: ['slack', 'vpn', 'known-error'], status: 'PUBLISHED' },
]
for (const seed of kbSeeds) {
  const existing = await db.collection('KnowledgeArticle').findOne({ title: seed.title })
  if (existing) continue
  const seq = await nextSeq('KnowledgeArticleSequence', 'knowledge_article_sequence')
  await db.collection('KnowledgeArticle').insertOne({
    articleId: `KB-DEMO-${String(seq).padStart(3, '0')}`,
    title: seed.title,
    description: `Step-by-step guidance for: ${seed.title.toLowerCase()}.`,
    category: seed.category,
    tags: seed.tags,
    status: seed.status,
    visibility: 'INTERNAL',
    version: 1,
    viewCount: Math.floor(Math.random() * 40),
    helpfulCount: Math.floor(Math.random() * 20),
    notHelpfulCount: Math.floor(Math.random() * 3),
    authorId: adminUser._id.toString(),
    authorName: adminUser.email,
    publishedDate: seed.status === 'PUBLISHED' ? daysAgo(Math.floor(Math.random() * 60)) : null,
    createDate: daysAgo(Math.floor(Math.random() * 60) + 5),
    modifyDate: daysAgo(Math.floor(Math.random() * 5)),
    userId: adminUser._id.toString(),
    userEmail: adminUser.email,
  })
}
console.log(`Knowledge Base: +${kbSeeds.length} articles`)

// ---------- Extra Problems ----------
const problemSeeds = [
  { title: 'Recurring printer jams on 3rd floor MFP', priority: 4, status: 'CLOSED' },
  { title: 'Intermittent SSO token expiry for new hires', priority: 2, status: 'KNOWN_ERROR' },
  { title: 'CRM export timeout affecting sales team', priority: 2, status: 'INVESTIGATING' },
  { title: 'Laptop fleet battery degradation', priority: 3, status: 'OPEN' },
]
for (const seed of problemSeeds) {
  const existing = await db.collection('Problem').findOne({ title: seed.title })
  if (existing) continue
  const seq = await nextSeq('ProblemSequence', 'problem_sequence')
  const now2 = daysAgo(Math.floor(Math.random() * 20) + 3)
  await db.collection('Problem').insertOne({
    problemId: `PRB-DEMO-${String(seq).padStart(3, '0')}`,
    title: seed.title,
    description: `Ongoing investigation into: ${seed.title.toLowerCase()}.`,
    priority: seed.priority,
    status: seed.status,
    symptoms: 'Reported by multiple users over the past two weeks.',
    rootCause: seed.status === 'CLOSED' || seed.status === 'KNOWN_ERROR' ? 'Firmware/driver incompatibility identified.' : '',
    workaround: seed.status !== 'OPEN' ? 'Manual restart resolves temporarily.' : '',
    knownError: seed.status === 'KNOWN_ERROR',
    permanentSolution: seed.status === 'CLOSED' ? 'Vendor firmware patch applied fleet-wide.' : '',
    closureNotes: seed.status === 'CLOSED' ? 'Verified resolved after patch rollout.' : '',
    linkedIncidentIds: [],
    linkedChangeIds: [],
    engineerId: engineerUser._id.toString(),
    workGroup: pick(['Infrastructure', 'Service Desk', 'Network']),
    createDate: now2,
    modifyDate: daysAgo(Math.floor(Math.random() * 3)),
    closeDate: seed.status === 'CLOSED' ? daysAgo(1) : null,
    userId: adminUser._id.toString(),
    userEmail: adminUser.email,
  })
}
console.log(`Problems: +${problemSeeds.length} (mix of lifecycle states)`)

// ---------- Extra Changes ----------
const changeSeeds = [
  { title: 'Rotate API keys for payment gateway integration', type: 'STANDARD', status: 'APPROVED', risk: 'LOW' },
  { title: 'Migrate file server to new storage array', type: 'NORMAL', status: 'CLOSED', risk: 'HIGH' },
  { title: 'Emergency patch for VPN gateway vulnerability', type: 'EMERGENCY', status: 'CLOSED', risk: 'HIGH' },
  { title: 'Update firewall rules for new vendor integration', type: 'NORMAL', status: 'REJECTED', risk: 'MEDIUM' },
]
for (const seed of changeSeeds) {
  const existing = await db.collection('Change').findOne({ title: seed.title })
  if (existing) continue
  const seq = await nextSeq('ChangeSequence', 'change_sequence')
  const startedDaysAgo = Math.floor(Math.random() * 25) + 3
  await db.collection('Change').insertOne({
    changeId: `CHG-DEMO-${String(seq).padStart(3, '0')}`,
    title: seed.title,
    description: `Change record for: ${seed.title.toLowerCase()}.`,
    type: seed.type,
    priority: pick([1, 2, 3]),
    riskLevel: seed.risk,
    status: seed.status,
    impactAnalysis: 'Assessed as low customer-facing impact with a defined maintenance window.',
    implementationPlan: 'Deploy via CI pipeline during the approved window.',
    backoutPlan: 'Revert via previous deployment tag.',
    testPlan: 'Validated against staging environment prior to rollout.',
    scheduledStart: daysAgo(startedDaysAgo),
    scheduledEnd: daysAgo(startedDaysAgo),
    linkedIncidentIds: [],
    linkedProblemIds: [],
    approvals:
      seed.status === 'REJECTED'
        ? [{ approverId: managerUser._id.toString(), approverEmail: managerUser.email, decision: 'REJECTED', comment: 'Needs more test coverage first.', decidedDate: daysAgo(startedDaysAgo + 1) }]
        : seed.status !== 'STANDARD'
          ? [{ approverId: managerUser._id.toString(), approverEmail: managerUser.email, decision: 'APPROVED', comment: 'Approved.', decidedDate: daysAgo(startedDaysAgo + 1) }]
          : [],
    engineerId: engineerUser._id.toString(),
    workGroup: pick(['Infrastructure', 'Network', 'Security']),
    closureNotes: seed.status === 'CLOSED' ? 'Deployed successfully, no incidents.' : '',
    reviewNotes: seed.status === 'CLOSED' ? 'Post-implementation review clean.' : '',
    createDate: daysAgo(startedDaysAgo + 2),
    modifyDate: daysAgo(Math.max(0, startedDaysAgo - 1)),
    closeDate: seed.status === 'CLOSED' ? daysAgo(Math.max(0, startedDaysAgo - 1)) : null,
    userId: adminUser._id.toString(),
    userEmail: adminUser.email,
  })
}
console.log(`Changes: +${changeSeeds.length} (STANDARD/NORMAL/EMERGENCY, incl. one REJECTED)`)

// ---------- Extra Releases ----------
const releaseSeeds = [
  { title: 'August Security Patch Rollup', version: '2.3.1', type: 'PATCH', status: 'CLOSED' },
  { title: 'Self-Service Portal Beta', version: '3.0.0-beta', type: 'MAJOR', status: 'TESTING' },
  { title: 'Firewall Rule Refresh', version: '2.4.1', type: 'PATCH', status: 'ROLLED_BACK' },
]
for (const seed of releaseSeeds) {
  const existing = await db.collection('Release').findOne({ title: seed.title })
  if (existing) continue
  const seq = await nextSeq('ReleaseSequence', 'release_sequence')
  const startedDaysAgo = Math.floor(Math.random() * 30) + 5
  await db.collection('Release').insertOne({
    releaseId: `REL-DEMO-${String(seq).padStart(3, '0')}`,
    title: seed.title,
    description: `Release covering: ${seed.title.toLowerCase()}.`,
    version: seed.version,
    type: seed.type,
    status: seed.status,
    plannedDate: daysAgo(startedDaysAgo),
    deployedDate: seed.status !== 'TESTING' ? daysAgo(startedDaysAgo - 1) : null,
    testNotes: 'Smoke tests passed on staging.',
    rollbackPlan: 'Revert to previous deployment tag via CI rollback job.',
    postReleaseReview: seed.status === 'CLOSED' ? 'No incidents post-release.' : seed.status === 'ROLLED_BACK' ? 'Rolled back due to unexpected regression in reporting module.' : '',
    linkedChangeIds: [],
    linkedProblemIds: [],
    linkedIncidentIds: [],
    engineerId: engineerUser._id.toString(),
    workGroup: 'Infrastructure',
    createDate: daysAgo(startedDaysAgo + 3),
    modifyDate: daysAgo(Math.max(0, startedDaysAgo - 2)),
    closeDate: seed.status === 'CLOSED' ? daysAgo(Math.max(0, startedDaysAgo - 2)) : null,
    userId: adminUser._id.toString(),
    userEmail: adminUser.email,
  })
}
console.log(`Releases: +${releaseSeeds.length} (incl. one ROLLED_BACK)`)

// ---------- Extra CMDB CIs ----------
const ciSeeds = [
  { name: 'DEMO-WEB-01', type: 'SERVER', os: 'Ubuntu 22.04', description: 'Public-facing web server' },
  { name: 'DEMO-CACHE-01', type: 'DATABASE', os: 'Redis 7', description: 'Session cache' },
  { name: 'DEMO-FW-01', type: 'NETWORK_DEVICE', os: '', description: 'Perimeter firewall' },
  { name: 'DEMO-VM-CI-runner', type: 'VIRTUAL_MACHINE', os: 'Debian 12', description: 'CI build runner' },
  { name: 'DEMO-S3-assets', type: 'CLOUD_RESOURCE', os: '', description: 'Static asset storage bucket' },
]
const ciIdByName = {}
for (const seed of ciSeeds) {
  const existing = await db.collection('ConfigurationItem').findOne({ name: seed.name })
  if (existing) {
    ciIdByName[seed.name] = existing._id
    continue
  }
  const seq = await nextSeq('CISequence', 'ci_sequence')
  const result = await db.collection('ConfigurationItem').insertOne({
    ciId: `CI-DEMO-${String(seq).padStart(3, '0')}`,
    name: seed.name,
    type: seed.type,
    status: 'ACTIVE',
    assetId: null,
    ipAddress: seed.type === 'NETWORK_DEVICE' || seed.type === 'SERVER' ? `10.20.0.${Math.floor(Math.random() * 200) + 10}` : '',
    macAddress: '',
    operatingSystem: seed.os,
    version: '',
    owner: 'Infrastructure Team',
    vendor: '',
    description: seed.description,
    createDate: daysAgo(Math.floor(Math.random() * 60) + 10),
    modifyDate: now,
    userId: adminUser._id.toString(),
    userEmail: adminUser.email,
    linkedCIIds: [],
  })
  ciIdByName[seed.name] = result.insertedId
}
// A couple more relationships so the graph has depth: FW -> WEB -> CACHE
const relSeeds = [
  ['DEMO-FW-01', 'DEMO-WEB-01', 'CONNECTED_TO'],
  ['DEMO-WEB-01', 'DEMO-CACHE-01', 'USES'],
]
for (const [source, target, type] of relSeeds) {
  if (!ciIdByName[source] || !ciIdByName[target]) continue
  const existing = await db.collection('CIRelationship').findOne({
    sourceId: ciIdByName[source].toString(),
    targetId: ciIdByName[target].toString(),
    relationshipType: type,
  })
  if (existing) continue
  await db.collection('CIRelationship').insertOne({
    sourceId: ciIdByName[source].toString(),
    targetId: ciIdByName[target].toString(),
    relationshipType: type,
    createDate: now,
    userId: adminUser._id.toString(),
    userEmail: adminUser.email,
  })
}
console.log(`CMDB: +${ciSeeds.length} CIs, +${relSeeds.length} relationships`)

// ---------- Extra Vendors + Contracts ----------
const vendorSeeds = [
  { name: 'Demo Office Supplies Co', contactPerson: 'Priya Nair', email: 'sales@demooffice-test.local' },
  { name: 'Demo Network Hardware Ltd', contactPerson: 'Marcus Lee', email: 'orders@demonetwork-test.local' },
]
const vendorIdByName = {}
for (const seed of vendorSeeds) {
  const existing = await db.collection('Vendor').findOne({ name: seed.name })
  if (existing) {
    vendorIdByName[seed.name] = existing
    continue
  }
  const seq = await nextSeq('VendorSequence', 'vendor_sequence')
  const doc = {
    vendorId: `VEN-DEMO-${String(seq).padStart(3, '0')}`,
    name: seed.name,
    contactPerson: seed.contactPerson,
    email: seed.email,
    phone: '9' + Math.floor(100000000 + Math.random() * 899999999),
    address: '',
    website: '',
    status: true,
    createDate: daysAgo(90),
    modifyDate: daysAgo(90),
    userId: adminUser._id.toString(),
    userEmail: adminUser.email,
  }
  const result = await db.collection('Vendor').insertOne(doc)
  vendorIdByName[seed.name] = { ...doc, _id: result.insertedId }
}

const contractSeeds = [
  { vendor: 'Demo Office Supplies Co', type: 'SERVICE', desc: 'Quarterly office equipment servicing', endInDays: 200, cost: 8000 },
  { vendor: 'Demo Network Hardware Ltd', type: 'WARRANTY', desc: 'Extended warranty on core switches', endInDays: 5, cost: 22000 },
  { vendor: 'Demo Network Hardware Ltd', type: 'LEASE', desc: 'Leased network hardware', endInDays: -15, cost: 30000, status: 'EXPIRED' },
]
for (const seed of contractSeeds) {
  const vendorDoc = vendorIdByName[seed.vendor]
  if (!vendorDoc) continue
  const existing = await db.collection('Contract').findOne({ vendorId: vendorDoc._id.toString(), description: seed.desc })
  if (existing) continue
  const seq = await nextSeq('ContractSequence', 'contract_sequence')
  await db.collection('Contract').insertOne({
    contractId: `CON-DEMO-${String(seq).padStart(3, '0')}`,
    vendorId: vendorDoc._id.toString(),
    vendorName: vendorDoc.name,
    type: seed.type,
    description: seed.desc,
    startDate: daysAgo(365 - seed.endInDays),
    endDate: daysFromNow(seed.endInDays),
    renewalDate: null,
    cost: seed.cost,
    status: seed.status || 'ACTIVE',
    linkedAssetIds: [],
    createDate: daysAgo(365 - seed.endInDays),
    modifyDate: daysAgo(365 - seed.endInDays),
    userId: adminUser._id.toString(),
    userEmail: adminUser.email,
  })
}
console.log(`Vendors: +${vendorSeeds.length}, Contracts: +${contractSeeds.length} (incl. one expired, one expiring in 5 days)`)

// ---------- Extra Software + Licenses ----------
const softwareSeeds = [
  { name: 'Demo Office Productivity Suite', publisher: 'Demo Publisher', category: 'Productivity', seats: 50, used: 47, expiryDays: 90 },
  { name: 'Demo Endpoint Security', publisher: 'Demo Security Co', category: 'Security', seats: 60, used: 60, expiryDays: 200 },
  { name: 'Demo Dev Tools IDE', publisher: 'Demo Dev Co', category: 'Development', seats: 15, used: 9, expiryDays: 45 },
]
for (const seed of softwareSeeds) {
  const existingSw = await db.collection('Software').findOne({ name: seed.name })
  let swDoc = existingSw
  if (!existingSw) {
    const seq = await nextSeq('SoftwareSequence', 'software_sequence')
    const doc = { softwareId: `SW-DEMO-${String(seq).padStart(3, '0')}`, name: seed.name, publisher: seed.publisher, category: seed.category, createDate: daysAgo(90), modifyDate: daysAgo(90), userId: adminUser._id.toString(), userEmail: adminUser.email }
    const result = await db.collection('Software').insertOne(doc)
    swDoc = { ...doc, _id: result.insertedId }
  }
  const existingLic = await db.collection('SoftwareLicense').findOne({ softwareId: swDoc._id.toString() })
  if (!existingLic) {
    const seq = await nextSeq('SoftwareLicenseSequence', 'software_license_sequence')
    await db.collection('SoftwareLicense').insertOne({
      licenseId: `LIC-DEMO-${String(seq).padStart(3, '0')}`,
      softwareId: swDoc._id.toString(),
      softwareName: swDoc.name,
      licenseKey: 'DEMO-XXXX-YYYY-ZZZZ',
      totalSeats: seed.seats,
      usedSeats: seed.used,
      vendor: seed.publisher,
      cost: seed.seats * 100,
      purchaseDate: daysAgo(90),
      expiryDate: daysFromNow(seed.expiryDays),
      status: 'ACTIVE',
      createDate: daysAgo(90),
      modifyDate: now,
      userId: adminUser._id.toString(),
      userEmail: adminUser.email,
    })
  }
}
console.log(`Software: +${softwareSeeds.length} titles with licenses (one at 100% capacity)`)

// ---------- Extra Discovery devices on the existing job ----------
const discoveryJob = await db.collection('DiscoveryJob').findOne({ jobId: 'DISC-DEMO-001' })
if (discoveryJob) {
  const extraDevices = [
    { ip: '10.20.0.51', hostname: 'demo-desktop-07', deviceType: 'DESKTOP' },
    { ip: '10.20.0.52', hostname: 'demo-laptop-hr-02', deviceType: 'LAPTOP' },
    { ip: '10.20.0.53', hostname: 'demo-ap-3rdfloor', deviceType: 'OTHER' },
  ]
  for (const dev of extraDevices) {
    const existing = await db.collection('DiscoveredDevice').findOne({ discoveryJobId: discoveryJob._id.toString(), ip: dev.ip })
    if (existing) continue
    await db.collection('DiscoveredDevice').insertOne({
      discoveryJobId: discoveryJob._id.toString(),
      ip: dev.ip,
      hostname: dev.hostname,
      mac: 'AA:BB:CC:00:22:' + dev.ip.split('.').pop().padStart(2, '0'),
      os: 'Unknown',
      deviceType: dev.deviceType,
      manufacturer: 'Dell',
      model: 'Generic',
      status: 'NEW',
      promotedCIId: null,
      discoveredDate: daysAgo(1),
    })
  }
  await db.collection('DiscoveryJob').updateOne({ _id: discoveryJob._id }, { $inc: { deviceCount: extraDevices.length } })
  console.log(`Discovery: +${extraDevices.length} NEW devices on DISC-DEMO-001`)
}

// ---------- Extra Announcements ----------
const announcementSeeds = [
  { title: 'New self-service portal now available', priority: 'NORMAL', audience: 'END_USER', startDaysAgo: 3, endDaysFromNow: 20 },
  { title: 'Reminder: update your VPN client by Friday', priority: 'HIGH', audience: 'ALL', startDaysAgo: 1, endDaysFromNow: 4 },
  { title: 'Holiday support hours next week', priority: 'LOW', audience: 'ALL', startDaysAgo: -2, endDaysFromNow: 10 },
]
for (const seed of announcementSeeds) {
  const existing = await db.collection('Announcement').findOne({ title: seed.title })
  if (existing) continue
  const seq = await nextSeq('AnnouncementSequence', 'announcement_sequence')
  await db.collection('Announcement').insertOne({
    announcementId: `ANN-DEMO-${String(seq).padStart(3, '0')}`,
    title: seed.title,
    description: `${seed.title}. Contact the service desk with any questions.`,
    priority: seed.priority,
    startDate: daysAgo(seed.startDaysAgo),
    endDate: daysFromNow(seed.endDaysFromNow),
    audience: seed.audience,
    source: 'MANUAL',
    sourceId: null,
    createDate: daysAgo(seed.startDaysAgo),
    modifyDate: daysAgo(seed.startDaysAgo),
    userId: adminUser._id.toString(),
    userEmail: adminUser.email,
  })
}
console.log(`Announcements: +${announcementSeeds.length}`)

// ---------- Extra Business Rules (disabled one included, to show that state in UI) ----------
const ruleSeeds = [
  { name: 'Demo: Auto-escalate P1 incidents', entityType: 'Incident', trigger: 'ON_CREATE', conditions: [{ field: 'priority', operator: 'EQUALS', value: 1 }], actions: [{ type: 'ASSIGN_GROUP', value: 'Infrastructure' }], enabled: true },
  { name: 'Demo: Flag finance-related requests', entityType: 'Problem', trigger: 'ON_CREATE', conditions: [{ field: 'title', operator: 'CONTAINS', value: 'finance' }], actions: [{ type: 'SET_FIELD', field: 'priority', value: 2 }], enabled: false },
]
for (const seed of ruleSeeds) {
  const existing = await db.collection('BusinessRule').findOne({ name: seed.name })
  if (existing) continue
  const seq = await nextSeq('BusinessRuleSequence', 'business_rule_sequence')
  await db.collection('BusinessRule').insertOne({
    ruleId: `RULE-DEMO-${String(seq).padStart(3, '0')}`,
    name: seed.name,
    entityType: seed.entityType,
    trigger: seed.trigger,
    conditions: seed.conditions,
    actions: seed.actions,
    priority: 1,
    enabled: seed.enabled,
    continueAfterMatch: true,
    createDate: daysAgo(5),
    modifyDate: daysAgo(5),
    userId: adminUser._id.toString(),
    userEmail: adminUser.email,
  })
}
console.log(`Business Rules: +${ruleSeeds.length} (one enabled, one disabled)`)

// ---------- Extra Service Catalog items ----------
const catalogSeeds = [
  { name: 'Demo: VPN Access Request', description: 'Request VPN access for remote work.', category: 'Access', approvalRequired: false, sla: 24, cost: 0 },
  { name: 'Demo: Software Installation Request', description: 'Request installation of approved software.', category: 'Software', approvalRequired: true, sla: 24, cost: 0 },
  { name: 'Demo: New Employee Onboarding', description: 'Full onboarding kit for a new hire.', category: 'HR', approvalRequired: true, sla: 72, cost: 500 },
]
for (const seed of catalogSeeds) {
  const existing = await db.collection('ServiceCatalogItem').findOne({ name: seed.name })
  if (existing) continue
  const seq = await nextSeq('CatalogItemSequence', 'catalog_item_sequence')
  await db.collection('ServiceCatalogItem').insertOne({
    itemId: `SVC-DEMO-${String(seq).padStart(3, '0')}`,
    name: seed.name,
    description: seed.description,
    category: seed.category,
    formFields: [{ id: 'notes', label: 'Additional Notes', type: 'TEXT', required: false, options: [] }],
    approvalRequired: seed.approvalRequired,
    approverIds: seed.approvalRequired ? [managerUser._id.toString()] : [],
    slaHours: seed.sla,
    assignmentGroup: 'Service Desk',
    cost: seed.cost,
    active: true,
    createDate: daysAgo(10),
    modifyDate: daysAgo(10),
    userId: adminUser._id.toString(),
    userEmail: adminUser.email,
  })
}
console.log(`Service Catalog: +${catalogSeeds.length} items`)

console.log('\n=== Volume seed complete ===')
await client.close()
