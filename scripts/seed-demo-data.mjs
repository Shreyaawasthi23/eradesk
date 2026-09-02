// Seeds realistic, interconnected demo data across all 18 new modules built this session, into
// the lrs-eradesk-v3 tenant. Attaches everything to clearly-labeled demo-only accounts
// (@eradesk-test.local) so real employee accounts in the cloned data are never touched.
//
// Usage: MONGODB_URI="..." node scripts/seed-demo-data.mjs
//
// Safe to re-run: demo users are upserted by email, and most entities check for an existing
// demo record with the same natural key before inserting again.
import { MongoClient, ObjectId } from 'mongodb'

const TENANT = 'lrs-eradesk-v3'
const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017'
const client = new MongoClient(uri)
await client.connect()
const db = client.db(TENANT)
console.log(`Connected to tenant "${TENANT}"`)

const now = new Date()
const daysAgo = (n) => new Date(now.getTime() - n * 86400000)
const daysFromNow = (n) => new Date(now.getTime() + n * 86400000)

async function nextSeq(collection, seqName) {
  const doc = await db
    .collection(collection)
    .findOneAndUpdate({ _id: seqName }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' })
  return doc && typeof doc.seq === 'number' ? doc.seq : 1
}

// ---------- 1. Demo users + roles ----------
const roleDocs = await db.collection('roles').find({}).toArray()
const roleIdByName = Object.fromEntries(roleDocs.map((r) => [r.name, r._id]))
for (const needed of ['ROLE_ADMIN', 'ROLE_USER', 'ROLE_MODERATOR', 'ROLE_ENGINEER']) {
  if (!roleIdByName[needed]) throw new Error(`Role ${needed} not found in tenant — aborting`)
}

async function upsertDemoUser(email, roleNames, extra = {}) {
  const roles = roleNames.map((name) => ({ $ref: 'roles', $id: roleIdByName[name] }))
  const existing = await db.collection('Users').findOne({ email })
  if (existing) {
    await db.collection('Users').updateOne({ _id: existing._id }, { $set: { roles, ...extra } })
    return existing._id
  }
  const result = await db.collection('Users').insertOne({
    email,
    firstName: extra.firstName || 'Demo',
    lastName: extra.lastName || 'User',
    username: email.split('@')[0],
    status: true,
    roles,
    createDate: now,
    modifyDate: now,
    ...extra,
  })
  return result.insertedId
}

// demo.admin gets a real password so it can log in through the actual /signin/email endpoint
// (and the login form, once NEXT_PUBLIC_TENANT points at this tenant) — the other three demo
// accounts are left password-less since this session only ever drives them via minted JWTs.
const DEMO_ADMIN_PASSWORD = 'DemoPass123!'
const adminId = await upsertDemoUser('demo.admin@eradesk-test.local', ['ROLE_ADMIN'], { firstName: 'Demo', lastName: 'Admin', password: DEMO_ADMIN_PASSWORD })
const managerId = await upsertDemoUser('demo.manager@eradesk-test.local', ['ROLE_MODERATOR'], { firstName: 'Demo', lastName: 'Manager' })
const engineerId = await upsertDemoUser('demo.engineer@eradesk-test.local', ['ROLE_ENGINEER'], { firstName: 'Demo', lastName: 'Engineer' })
const financeId = await upsertDemoUser('demo.finance@eradesk-test.local', ['ROLE_MODERATOR'], { firstName: 'Demo', lastName: 'Finance' })
console.log('Demo users ready:', { adminId: adminId.toString(), managerId: managerId.toString(), engineerId: engineerId.toString(), financeId: financeId.toString() })
console.log(`Login: demo.admin@eradesk-test.local / ${DEMO_ADMIN_PASSWORD} (works against /api/auth/signin/email today; the login form needs NEXT_PUBLIC_TENANT=lrs-eradesk-v3 to use it)`)

const adminUser = { _id: adminId, email: 'demo.admin@eradesk-test.local' }

// ---------- 2. Incidents (base for Problem/Change/Release/CMDB linking) ----------
async function findOrCreateIncident(incidentId, fields) {
  const existing = await db.collection('Incident').findOne({ incidentId })
  if (existing) return existing._id
  const result = await db.collection('Incident').insertOne({
    incidentId,
    incidentDate: now,
    problem: fields.problem,
    priority: fields.priority,
    status: fields.status,
    engineerId: engineerId.toString(),
    createDate: daysAgo(fields.daysAgo || 5),
    modifyDate: now,
    userId: adminId.toString(),
    userEmail: adminUser.email,
  })
  return result.insertedId
}

const incident1Id = await findOrCreateIncident('DEMO-INC-001', { problem: 'Production database server DEMO-DB-01 unresponsive', priority: 1, status: 'CLOSED', daysAgo: 10 })
const incident2Id = await findOrCreateIncident('DEMO-INC-002', { problem: 'Production database server DEMO-DB-01 slow again', priority: 1, status: 'CLOSED', daysAgo: 6 })
const incident3Id = await findOrCreateIncident('DEMO-INC-003', { problem: 'VPN connection dropping intermittently', priority: 2, status: 'OPEN', daysAgo: 1 })
console.log('Incidents:', { incident1Id: incident1Id.toString(), incident2Id: incident2Id.toString(), incident3Id: incident3Id.toString() })

// ---------- 3. Problem (links both DB incidents, has full RCA lifecycle) ----------
async function findOrCreateProblem() {
  const existing = await db.collection('Problem').findOne({ title: 'Recurring DEMO-DB-01 performance degradation' })
  if (existing) return existing
  const seq = await nextSeq('ProblemSequence', 'problem_sequence')
  const problemId = `PRB-DEMO-${String(seq).padStart(3, '0')}`
  const doc = {
    problemId,
    title: 'Recurring DEMO-DB-01 performance degradation',
    description: 'DEMO-DB-01 has become unresponsive twice in the past two weeks under peak load.',
    priority: 1,
    status: 'CLOSED',
    symptoms: 'Query latency spikes, connection pool exhaustion',
    rootCause: 'Missing index on the orders table causing full table scans under load',
    workaround: 'Restart the DB service and manually run ANALYZE',
    knownError: true,
    permanentSolution: 'Added composite index; deployed via DEMO-CHG-001',
    closureNotes: 'Root cause fixed and verified over one week of peak-load monitoring with no recurrence.',
    linkedIncidentIds: [incident1Id.toString(), incident2Id.toString()],
    linkedChangeIds: [],
    engineerId: engineerId.toString(),
    workGroup: 'Infrastructure',
    createDate: daysAgo(6),
    modifyDate: daysAgo(1),
    closeDate: daysAgo(1),
    userId: adminId.toString(),
    userEmail: adminUser.email,
  }
  const result = await db.collection('Problem').insertOne(doc)
  return { ...doc, _id: result.insertedId }
}
const problem = await findOrCreateProblem()
console.log('Problem:', problem.problemId, problem._id.toString())

// ---------- 4. Change (links to the problem, fully approved+implemented) ----------
async function findOrCreateChange() {
  const existing = await db.collection('Change').findOne({ title: 'Add composite index to orders table on DEMO-DB-01' })
  if (existing) return existing
  const seq = await nextSeq('ChangeSequence', 'change_sequence')
  const changeId = `CHG-DEMO-${String(seq).padStart(3, '0')}`
  const doc = {
    changeId,
    title: 'Add composite index to orders table on DEMO-DB-01',
    description: 'Permanent fix for the recurring performance problem: add a composite index on (customer_id, created_at).',
    type: 'NORMAL',
    priority: 2,
    riskLevel: 'MEDIUM',
    status: 'CLOSED',
    impactAnalysis: 'Brief write-lock during index build (~2 min); no downtime expected.',
    implementationPlan: 'Run CREATE INDEX CONCURRENTLY during the maintenance window, verify query plan afterward.',
    backoutPlan: 'DROP INDEX if query performance regresses; revert is instantaneous.',
    testPlan: 'Validated the index improves query plan on a staging snapshot of the orders table.',
    scheduledStart: daysAgo(3),
    scheduledEnd: daysAgo(3),
    linkedIncidentIds: [incident1Id.toString(), incident2Id.toString()],
    linkedProblemIds: [problem._id.toString()],
    approvals: [
      { approverId: managerId.toString(), approverEmail: 'demo.manager@eradesk-test.local', decision: 'APPROVED', comment: 'Low risk, approved.', decidedDate: daysAgo(4) },
    ],
    engineerId: engineerId.toString(),
    workGroup: 'Infrastructure',
    closureNotes: 'Deployed successfully, verified no recurrence for a full week.',
    reviewNotes: 'Index build completed in 90s with no observed impact on production traffic.',
    createDate: daysAgo(5),
    modifyDate: daysAgo(2),
    closeDate: daysAgo(2),
    userId: adminId.toString(),
    userEmail: adminUser.email,
  }
  const result = await db.collection('Change').insertOne(doc)
  await db.collection('Problem').updateOne({ _id: problem._id }, { $addToSet: { linkedChangeIds: result.insertedId.toString() } })
  return { ...doc, _id: result.insertedId }
}
const change1 = await findOrCreateChange()
console.log('Change:', change1.changeId, change1._id.toString())

// A second change, left PENDING_APPROVAL, so the approval-decision workflow has something live
// to test.
async function findOrCreatePendingChange() {
  const existing = await db.collection('Change').findOne({ title: 'Upgrade DEMO-DB-01 to PostgreSQL 16' })
  if (existing) return existing
  const seq = await nextSeq('ChangeSequence', 'change_sequence')
  const changeId = `CHG-DEMO-${String(seq).padStart(3, '0')}`
  const doc = {
    changeId,
    title: 'Upgrade DEMO-DB-01 to PostgreSQL 16',
    description: 'Major version upgrade for security patches and performance improvements.',
    type: 'NORMAL',
    priority: 3,
    riskLevel: 'HIGH',
    status: 'PENDING_APPROVAL',
    impactAnalysis: 'Requires ~30 min downtime during the maintenance window.',
    implementationPlan: 'pg_upgrade in-place, validated on staging first.',
    backoutPlan: 'Restore from pre-upgrade snapshot.',
    testPlan: 'Full regression suite run against staging after upgrade.',
    scheduledStart: null,
    scheduledEnd: null,
    linkedIncidentIds: [],
    linkedProblemIds: [],
    approvals: [],
    engineerId: engineerId.toString(),
    workGroup: 'Infrastructure',
    closureNotes: '',
    reviewNotes: '',
    createDate: daysAgo(1),
    modifyDate: daysAgo(1),
    closeDate: null,
    userId: adminId.toString(),
    userEmail: adminUser.email,
  }
  const result = await db.collection('Change').insertOne(doc)
  return { ...doc, _id: result.insertedId }
}
const change2 = await findOrCreatePendingChange()
console.log('Pending change:', change2.changeId, change2._id.toString())

// ---------- 5. Release (bundles the completed change) ----------
async function findOrCreateRelease() {
  const existing = await db.collection('Release').findOne({ title: 'Q3 Database Performance Release' })
  if (existing) return existing
  const seq = await nextSeq('ReleaseSequence', 'release_sequence')
  const releaseId = `REL-DEMO-${String(seq).padStart(3, '0')}`
  const doc = {
    releaseId,
    title: 'Q3 Database Performance Release',
    description: 'Bundles the DEMO-DB-01 indexing fix and related monitoring improvements.',
    version: '2.4.0',
    type: 'MINOR',
    status: 'CLOSED',
    plannedDate: daysAgo(4),
    deployedDate: daysAgo(3),
    testNotes: 'Validated on staging; smoke tests passed.',
    rollbackPlan: 'Revert to previous deployment tag via CI rollback job.',
    postReleaseReview: 'No incidents post-release; DB performance improved as expected.',
    linkedChangeIds: [change1._id.toString()],
    linkedProblemIds: [problem._id.toString()],
    linkedIncidentIds: [incident1Id.toString(), incident2Id.toString()],
    engineerId: engineerId.toString(),
    workGroup: 'Infrastructure',
    createDate: daysAgo(5),
    modifyDate: daysAgo(2),
    closeDate: daysAgo(2),
    userId: adminId.toString(),
    userEmail: adminUser.email,
  }
  const result = await db.collection('Release').insertOne(doc)
  return { ...doc, _id: result.insertedId }
}
const release = await findOrCreateRelease()
console.log('Release:', release.releaseId, release._id.toString())

// ---------- 6. CMDB: CI for the DB server + relationship to an application CI ----------
async function findOrCreateCI(name, type, extra = {}) {
  const existing = await db.collection('ConfigurationItem').findOne({ name })
  if (existing) return existing
  const seq = await nextSeq('CISequence', 'ci_sequence')
  const ciId = `CI-DEMO-${String(seq).padStart(3, '0')}`
  const doc = {
    ciId,
    name,
    type,
    status: 'ACTIVE',
    assetId: null,
    ipAddress: extra.ipAddress || '',
    macAddress: '',
    operatingSystem: extra.os || '',
    version: extra.version || '',
    owner: 'Infrastructure Team',
    vendor: extra.vendor || '',
    description: extra.description || '',
    createDate: daysAgo(30),
    modifyDate: now,
    userId: adminId.toString(),
    userEmail: adminUser.email,
    linkedCIIds: [],
  }
  const result = await db.collection('ConfigurationItem').insertOne(doc)
  return { ...doc, _id: result.insertedId }
}
const dbCI = await findOrCreateCI('DEMO-DB-01', 'DATABASE', { ipAddress: '10.20.0.15', os: 'PostgreSQL 15', vendor: 'PostgreSQL', description: 'Primary orders database' })
const appCI = await findOrCreateCI('DEMO-APP-orders-api', 'APPLICATION', { version: '3.2.1', description: 'Orders API service' })

async function findOrCreateRelationship(sourceId, targetId, relationshipType) {
  const existing = await db.collection('CIRelationship').findOne({ sourceId: sourceId.toString(), targetId: targetId.toString(), relationshipType })
  if (existing) return existing
  const result = await db.collection('CIRelationship').insertOne({
    sourceId: sourceId.toString(),
    targetId: targetId.toString(),
    relationshipType,
    createDate: now,
    userId: adminId.toString(),
    userEmail: adminUser.email,
  })
  return result
}
await findOrCreateRelationship(appCI._id, dbCI._id, 'USES')
console.log('CMDB:', { dbCI: dbCI.ciId, appCI: appCI.ciId, relationship: 'APP USES DB' })

// Link the DB CI to the incidents that affected it, so CIDetail's "Linked Incidents" panel has data.
await db.collection('Incident').updateOne({ _id: incident1Id }, { $addToSet: { linkedCIIds: dbCI._id.toString() } })
await db.collection('Incident').updateOne({ _id: incident2Id }, { $addToSet: { linkedCIIds: dbCI._id.toString() } })

// ---------- 7. Vendor + Contract (one active near-expiry, one expiring soon for the alert view) ----------
async function findOrCreateVendor(name, extra = {}) {
  const existing = await db.collection('Vendor').findOne({ name })
  if (existing) return existing
  const seq = await nextSeq('VendorSequence', 'vendor_sequence')
  const vendorId = `VEN-DEMO-${String(seq).padStart(3, '0')}`
  const doc = {
    vendorId,
    name,
    contactPerson: extra.contactPerson || '',
    email: extra.email || '',
    phone: extra.phone || '',
    address: extra.address || '',
    website: extra.website || '',
    status: true,
    createDate: daysAgo(60),
    modifyDate: daysAgo(60),
    userId: adminId.toString(),
    userEmail: adminUser.email,
  }
  const result = await db.collection('Vendor').insertOne(doc)
  return { ...doc, _id: result.insertedId }
}
const vendor = await findOrCreateVendor('Demo Cloud Support Co', { contactPerson: 'Alex Rivera', email: 'support@democloud-test.local', phone: '9999999999' })

async function findOrCreateContract(vendorDoc, type, description, startDate, endDate, cost) {
  const existing = await db.collection('Contract').findOne({ vendorId: vendorDoc._id.toString(), description })
  if (existing) return existing
  const seq = await nextSeq('ContractSequence', 'contract_sequence')
  const contractId = `CON-DEMO-${String(seq).padStart(3, '0')}`
  const doc = {
    contractId,
    vendorId: vendorDoc._id.toString(),
    vendorName: vendorDoc.name,
    type,
    description,
    startDate,
    endDate,
    renewalDate: null,
    cost,
    status: 'ACTIVE',
    linkedAssetIds: [],
    createDate: daysAgo(60),
    modifyDate: daysAgo(60),
    userId: adminId.toString(),
    userEmail: adminUser.email,
  }
  const result = await db.collection('Contract').insertOne(doc)
  return { ...doc, _id: result.insertedId }
}
const contract1 = await findOrCreateContract(vendor, 'AMC', 'Annual maintenance contract for DEMO-DB-01', daysAgo(300), daysFromNow(65), 50000)
const contract2 = await findOrCreateContract(vendor, 'SERVICE', 'Cloud support retainer (expiring soon)', daysAgo(340), daysFromNow(12), 15000)
console.log('Contracts:', { contract1: contract1.contractId + ' (65d)', contract2: contract2.contractId + ' (12d, near-expiry)' })

// ---------- 8. Software + License (near capacity, to exercise the compliance view) ----------
async function findOrCreateSoftware(name, publisher, category) {
  const existing = await db.collection('Software').findOne({ name })
  if (existing) return existing
  const seq = await nextSeq('SoftwareSequence', 'software_sequence')
  const softwareId = `SW-DEMO-${String(seq).padStart(3, '0')}`
  const doc = { softwareId, name, publisher, category, createDate: daysAgo(90), modifyDate: daysAgo(90), userId: adminId.toString(), userEmail: adminUser.email }
  const result = await db.collection('Software').insertOne(doc)
  return { ...doc, _id: result.insertedId }
}
const software = await findOrCreateSoftware('Demo Design Suite', 'Demo Publisher', 'Design')

async function findOrCreateLicense(softwareDoc, totalSeats, usedSeats, expiryDate) {
  const existing = await db.collection('SoftwareLicense').findOne({ softwareId: softwareDoc._id.toString() })
  if (existing) return existing
  const seq = await nextSeq('SoftwareLicenseSequence', 'software_license_sequence')
  const licenseId = `LIC-DEMO-${String(seq).padStart(3, '0')}`
  const doc = {
    licenseId,
    softwareId: softwareDoc._id.toString(),
    softwareName: softwareDoc.name,
    licenseKey: 'DEMO-XXXX-YYYY-ZZZZ',
    totalSeats,
    usedSeats,
    vendor: 'Demo Publisher',
    cost: 12000,
    purchaseDate: daysAgo(90),
    expiryDate,
    status: 'ACTIVE',
    createDate: daysAgo(90),
    modifyDate: now,
    userId: adminId.toString(),
    userEmail: adminUser.email,
  }
  const result = await db.collection('SoftwareLicense').insertOne(doc)
  return { ...doc, _id: result.insertedId }
}
const license = await findOrCreateLicense(software, 5, 4, daysFromNow(20))

async function findOrCreateInstallation(licenseDoc, deviceLabel) {
  const existing = await db.collection('SoftwareInstallation').findOne({ licenseId: licenseDoc._id.toString(), deviceLabel })
  if (existing) return existing
  const result = await db.collection('SoftwareInstallation').insertOne({
    licenseId: licenseDoc._id.toString(),
    ciId: null,
    assetId: null,
    installedUserId: null,
    deviceLabel,
    installDate: daysAgo(30),
    userId: adminId.toString(),
    userEmail: adminUser.email,
  })
  return result
}
for (let i = 1; i <= 4; i++) {
  await findOrCreateInstallation(license, `demo-laptop-${i}`)
}
console.log('Software:', { software: software.softwareId, license: license.licenseId, seats: '4/5 used' })

// ---------- 9. Discovery job + a couple of discovered devices (one promotable) ----------
async function findOrCreateDiscoveryJob() {
  const existing = await db.collection('DiscoveryJob').findOne({ name: 'Demo Office Scan' })
  if (existing) return existing
  const seq = await nextSeq('DiscoveryJobSequence', 'discovery_job_sequence')
  const jobId = `DISC-DEMO-${String(seq).padStart(3, '0')}`
  const doc = {
    jobId,
    name: 'Demo Office Scan',
    cidr: '10.20.0.0/24',
    schedule: 'Every 24 hours',
    status: 'ACTIVE',
    agentToken: 'demo-token-not-a-real-secret',
    lastRunDate: daysAgo(1),
    deviceCount: 2,
    createDate: daysAgo(7),
    modifyDate: daysAgo(1),
    userId: adminId.toString(),
    userEmail: adminUser.email,
  }
  const result = await db.collection('DiscoveryJob').insertOne(doc)
  return { ...doc, _id: result.insertedId }
}
const discoveryJob = await findOrCreateDiscoveryJob()

async function findOrCreateDiscoveredDevice(jobDoc, ip, hostname, deviceType, status) {
  const existing = await db.collection('DiscoveredDevice').findOne({ discoveryJobId: jobDoc._id.toString(), ip })
  if (existing) return existing
  const result = await db.collection('DiscoveredDevice').insertOne({
    discoveryJobId: jobDoc._id.toString(),
    ip,
    hostname,
    mac: 'AA:BB:CC:00:11:' + ip.split('.').pop().padStart(2, '0'),
    os: 'Ubuntu 22.04',
    deviceType,
    manufacturer: 'Dell',
    model: 'PowerEdge',
    status,
    promotedCIId: null,
    discoveredDate: daysAgo(1),
  })
  return result
}
await findOrCreateDiscoveredDevice(discoveryJob, '10.20.0.42', 'demo-printer-01', 'PRINTER', 'NEW')
await findOrCreateDiscoveredDevice(discoveryJob, '10.20.0.43', 'demo-switch-01', 'SWITCH', 'NEW')
console.log('Discovery:', { job: discoveryJob.jobId, devices: '2 NEW (ready to promote/ignore)' })

// ---------- 10. Approval Engine: one PENDING (actionable by demo.manager), one APPROVED ----------
async function findOrCreateApproval(entityId, entityLabel, mode, approverIdList, decideFirstStep) {
  const existing = await db.collection('ApprovalRequest').findOne({ entityId: entityId.toString() })
  if (existing) return existing
  const seq = await nextSeq('ApprovalSequence', 'approval_sequence')
  const approvalId = `APR-DEMO-${String(seq).padStart(3, '0')}`
  const steps = approverIdList.map((id, idx) => ({
    order: idx + 1,
    approverId: id.toString(),
    approverEmail: idx === 0 ? 'demo.manager@eradesk-test.local' : 'demo.finance@eradesk-test.local',
    status: mode === 'SEQUENTIAL' && idx > 0 ? 'WAITING' : 'PENDING',
    comment: '',
    decidedDate: null,
  }))
  const doc = {
    approvalId,
    entityType: 'DEMO_ENTITY',
    entityId: entityId.toString(),
    entityLabel,
    mode,
    status: 'PENDING',
    steps,
    requestedById: adminId.toString(),
    requestedByEmail: adminUser.email,
    createDate: daysAgo(1),
    modifyDate: daysAgo(1),
  }
  const result = await db.collection('ApprovalRequest').insertOne(doc)
  return { ...doc, _id: result.insertedId }
}
const pendingApproval = await findOrCreateApproval('demo-approval-entity-1', 'Demo: New Server Purchase Request', 'SEQUENTIAL', [managerId, financeId])
console.log('Pending approval for demo.manager:', pendingApproval.approvalId)

// ---------- 11. Business Rule: auto-routes VPN-titled problems to Network Team, P1 ----------
async function findOrCreateBusinessRule() {
  const existing = await db.collection('BusinessRule').findOne({ name: 'Demo: Auto-route VPN issues' })
  if (existing) return existing
  const seq = await nextSeq('BusinessRuleSequence', 'business_rule_sequence')
  const ruleId = `RULE-DEMO-${String(seq).padStart(3, '0')}`
  const doc = {
    ruleId,
    name: 'Demo: Auto-route VPN issues',
    entityType: 'Problem',
    trigger: 'ON_CREATE',
    conditions: [{ field: 'title', operator: 'CONTAINS', value: 'vpn' }],
    actions: [
      { type: 'SET_FIELD', field: 'priority', value: 1 },
      { type: 'ASSIGN_GROUP', value: 'Network Team' },
    ],
    priority: 0,
    enabled: true,
    continueAfterMatch: true,
    createDate: daysAgo(2),
    modifyDate: daysAgo(2),
    userId: adminId.toString(),
    userEmail: adminUser.email,
  }
  const result = await db.collection('BusinessRule').insertOne(doc)
  return { ...doc, _id: result.insertedId }
}
const rule = await findOrCreateBusinessRule()
console.log('Business rule ready (test it by creating a Problem titled containing "VPN"):', rule.ruleId)

// ---------- 12. SLA config + policy ----------
await db.collection('BusinessHours').updateOne(
  { _id: 'config' },
  { $set: { workDays: [1, 2, 3, 4, 5], startMinute: 540, endMinute: 1080, timezone: 'UTC', modifyDate: now } },
  { upsert: true },
)
const holidayDate = daysFromNow(10).toISOString().slice(0, 10)
const existingHoliday = await db.collection('Holiday').findOne({ date: holidayDate })
if (!existingHoliday) {
  await db.collection('Holiday').insertOne({ date: holidayDate, name: 'Demo Holiday' })
}
const existingSlaPolicy = await db.collection('SLAPolicy').findOne({ name: 'Demo Incident SLA' })
if (!existingSlaPolicy) {
  const seq = await nextSeq('SlaPolicySequence', 'sla_policy_sequence')
  await db.collection('SLAPolicy').insertOne({
    policyId: `SLA-DEMO-${String(seq).padStart(3, '0')}`,
    name: 'Demo Incident SLA',
    entityType: 'Incident',
    targets: [
      { priority: 1, responseMinutes: 60, resolutionMinutes: 240 },
      { priority: 2, responseMinutes: 120, resolutionMinutes: 480 },
      { priority: 3, responseMinutes: 240, resolutionMinutes: 1440 },
    ],
    active: true,
    createDate: now,
    modifyDate: now,
    userId: adminId.toString(),
    userEmail: adminUser.email,
  })
}
console.log('SLA config ready: business hours 9-6 Mon-Fri, 1 holiday, 1 policy (P1/P2/P3 targets)')

// ---------- 13. Service Catalog item (approval-required) + one submitted request ----------
async function findOrCreateCatalogItem() {
  const existing = await db.collection('ServiceCatalogItem').findOne({ name: 'Demo: New Laptop Request' })
  if (existing) return existing
  const seq = await nextSeq('CatalogItemSequence', 'catalog_item_sequence')
  const itemId = `SVC-DEMO-${String(seq).padStart(3, '0')}`
  const doc = {
    itemId,
    name: 'Demo: New Laptop Request',
    description: 'Request a new laptop for a new hire or replacement.',
    category: 'Hardware',
    formFields: [
      { id: 'laptop_model', label: 'Laptop Model', type: 'DROPDOWN', required: true, options: ['Dell XPS 13', 'MacBook Pro 14'] },
      { id: 'justification', label: 'Justification', type: 'TEXT', required: true, options: [] },
    ],
    approvalRequired: true,
    approverIds: [managerId.toString()],
    slaHours: 48,
    assignmentGroup: 'IT Procurement',
    cost: 1500,
    active: true,
    createDate: daysAgo(10),
    modifyDate: daysAgo(10),
    userId: adminId.toString(),
    userEmail: adminUser.email,
  }
  const result = await db.collection('ServiceCatalogItem').insertOne(doc)
  return { ...doc, _id: result.insertedId }
}
const catalogItem = await findOrCreateCatalogItem()

async function findOrCreateServiceRequest(itemDoc) {
  const existing = await db.collection('ServiceRequest').findOne({ catalogItemId: itemDoc._id.toString() })
  if (existing) return existing
  const seq = await nextSeq('ServiceRequestSequence', 'service_request_sequence')
  const requestId = `REQ-DEMO-${String(seq).padStart(3, '0')}`
  const approvalSeq = await nextSeq('ApprovalSequence', 'approval_sequence')
  const approvalId = `APR-DEMO-${String(approvalSeq).padStart(3, '0')}`
  const approvalResult = await db.collection('ApprovalRequest').insertOne({
    approvalId,
    entityType: 'SERVICE_REQUEST',
    entityId: null, // filled in after we know the service request _id
    entityLabel: `${itemDoc.name} (${requestId})`,
    mode: 'SEQUENTIAL',
    status: 'PENDING',
    steps: [{ order: 1, approverId: managerId.toString(), approverEmail: 'demo.manager@eradesk-test.local', status: 'PENDING', comment: '', decidedDate: null }],
    requestedById: adminId.toString(),
    requestedByEmail: adminUser.email,
    createDate: daysAgo(1),
    modifyDate: daysAgo(1),
  })
  const doc = {
    requestId,
    catalogItemId: itemDoc._id.toString(),
    catalogItemName: itemDoc.name,
    formData: { laptop_model: 'Dell XPS 13', justification: 'New hire starting next week' },
    status: 'PENDING_APPROVAL',
    approvalRequestId: approvalResult.insertedId.toString(),
    assignmentGroup: itemDoc.assignmentGroup,
    engineerId: null,
    requesterId: adminId.toString(),
    requesterEmail: adminUser.email,
    closureNotes: '',
    createDate: daysAgo(1),
    modifyDate: daysAgo(1),
    closeDate: null,
  }
  const result = await db.collection('ServiceRequest').insertOne(doc)
  await db.collection('ApprovalRequest').updateOne({ _id: approvalResult.insertedId }, { $set: { entityId: result.insertedId.toString() } })
  return { ...doc, _id: result.insertedId }
}
const serviceRequest = await findOrCreateServiceRequest(catalogItem)
console.log('Service Catalog:', { item: catalogItem.itemId, request: serviceRequest.requestId + ' (PENDING_APPROVAL, actionable by demo.manager)' })

// ---------- 14. Survey template + one SENT (respondable) + one SUBMITTED (for the report) ----------
async function findOrCreateSurveyTemplate() {
  const existing = await db.collection('SurveyTemplate').findOne({ title: 'Demo CSAT Survey' })
  if (existing) return existing
  const seq = await nextSeq('SurveyTemplateSequence', 'survey_template_sequence')
  const templateId = `SVY-DEMO-${String(seq).padStart(3, '0')}`
  const doc = {
    templateId,
    title: 'Demo CSAT Survey',
    description: 'How did we do resolving your issue?',
    questions: [
      { id: 'rating', text: 'Rate our service', type: 'RATING', options: [] },
      { id: 'comments', text: 'Any comments?', type: 'TEXT', options: [] },
    ],
    triggerDelayHours: 1,
    active: true,
    createDate: daysAgo(20),
    modifyDate: daysAgo(20),
    userId: adminId.toString(),
    userEmail: adminUser.email,
  }
  const result = await db.collection('SurveyTemplate').insertOne(doc)
  return { ...doc, _id: result.insertedId }
}
const surveyTemplate = await findOrCreateSurveyTemplate()

async function findOrCreateSurveyResponse(templateDoc, incidentRefId, incidentIdStr, respondentEmail, status, answers) {
  const existing = await db.collection('SurveyResponse').findOne({ templateId: templateDoc._id.toString(), incidentRefId: incidentRefId.toString() })
  if (existing) return existing
  const doc = {
    templateId: templateDoc._id.toString(),
    templateTitle: templateDoc.title,
    incidentId: incidentIdStr,
    incidentRefId: incidentRefId.toString(),
    respondentEmail,
    status,
    answers,
    scheduledSendDate: daysAgo(9),
    sentDate: status !== 'SCHEDULED' ? daysAgo(9) : null,
    submittedDate: status === 'SUBMITTED' ? daysAgo(8) : null,
    createDate: daysAgo(10),
  }
  const result = await db.collection('SurveyResponse').insertOne(doc)
  return { ...doc, _id: result.insertedId }
}
const surveyResponse1 = await findOrCreateSurveyResponse(surveyTemplate, incident1Id, 'DEMO-INC-001', 'customer1@demo-test.local', 'SENT', [])
const surveyResponse2 = await findOrCreateSurveyResponse(surveyTemplate, incident2Id, 'DEMO-INC-002', 'customer2@demo-test.local', 'SUBMITTED', [
  { questionId: 'rating', questionText: 'Rate our service', value: 5 },
  { questionId: 'comments', questionText: 'Any comments?', value: 'Fixed quickly, thanks!' },
])
console.log('Surveys:', { template: surveyTemplate.templateId, respondable: surveyResponse1._id.toString(), submitted: 'yes (feeds the report)' })

// ---------- 15. Announcement + Maintenance Window ----------
async function findOrCreateAnnouncement() {
  const existing = await db.collection('Announcement').findOne({ title: 'Demo: Scheduled network maintenance' })
  if (existing) return existing
  const seq = await nextSeq('AnnouncementSequence', 'announcement_sequence')
  const announcementId = `ANN-DEMO-${String(seq).padStart(3, '0')}`
  const doc = {
    announcementId,
    title: 'Demo: Scheduled network maintenance',
    description: 'Brief network blip expected during the maintenance window this weekend.',
    priority: 'NORMAL',
    startDate: daysAgo(1),
    endDate: daysFromNow(5),
    audience: 'ALL',
    source: 'MANUAL',
    sourceId: null,
    createDate: daysAgo(1),
    modifyDate: daysAgo(1),
    userId: adminId.toString(),
    userEmail: adminUser.email,
  }
  const result = await db.collection('Announcement').insertOne(doc)
  return { ...doc, _id: result.insertedId }
}
const announcement = await findOrCreateAnnouncement()

async function findOrCreateMaintenanceWindow() {
  const existing = await db.collection('MaintenanceWindow').findOne({ name: 'Demo: Router firmware upgrade' })
  if (existing) return existing
  const seq = await nextSeq('MaintenanceWindowSequence', 'maintenance_window_sequence')
  const windowId = `MNT-DEMO-${String(seq).padStart(3, '0')}`
  const doc = {
    windowId,
    name: 'Demo: Router firmware upgrade',
    description: 'Upgrading core router firmware to the latest stable release.',
    startDate: daysFromNow(2),
    endDate: daysFromNow(2),
    servicesAffected: ['Network', 'VPN'],
    sitesAffected: ['Head Office'],
    status: 'SCHEDULED',
    announcementId: announcement._id.toString(),
    createDate: daysAgo(1),
    modifyDate: daysAgo(1),
    userId: adminId.toString(),
    userEmail: adminUser.email,
  }
  const result = await db.collection('MaintenanceWindow').insertOne(doc)
  return { ...doc, _id: result.insertedId }
}
const maintenanceWindow = await findOrCreateMaintenanceWindow()
console.log('Announcements/Maintenance:', { announcement: announcement.announcementId, window: maintenanceWindow.windowId })

// ---------- 16. Monitoring Integration (with one recorded event) ----------
async function findOrCreateMonitoringIntegration() {
  const existing = await db.collection('MonitoringIntegration').findOne({ name: 'Demo Monitoring (Datadog-style)' })
  if (existing) return existing
  const seq = await nextSeq('MonitoringIntegrationSequence', 'monitoring_integration_sequence')
  const integrationId = `MON-DEMO-${String(seq).padStart(3, '0')}`
  const doc = {
    integrationId,
    name: 'Demo Monitoring (Datadog-style)',
    webhookToken: 'demo-webhook-token-not-a-real-secret',
    defaultWorkGroup: 'Infrastructure',
    defaultPriority: 1,
    active: true,
    eventCount: 1,
    lastEventDate: daysAgo(1),
    createDate: daysAgo(15),
    userId: adminId.toString(),
    userEmail: adminUser.email,
  }
  const result = await db.collection('MonitoringIntegration').insertOne(doc)
  return { ...doc, _id: result.insertedId }
}
const monitoringIntegration = await findOrCreateMonitoringIntegration()
console.log('Monitoring integration:', monitoringIntegration.integrationId)

// ---------- 17. Saved Report ----------
async function findOrCreateSavedReport() {
  const existing = await db.collection('SavedReport').findOne({ name: 'Demo: Open P1/P2 Incidents' })
  if (existing) return existing
  const seq = await nextSeq('SavedReportSequence', 'saved_report_sequence')
  const reportId = `RPT-DEMO-${String(seq).padStart(3, '0')}`
  const doc = {
    reportId,
    name: 'Demo: Open P1/P2 Incidents',
    dataSource: 'Incident',
    fields: ['incidentId', 'problem', 'priority', 'status'],
    filters: [{ field: 'status', operator: 'EQUALS', value: 'OPEN' }],
    groupBy: 'priority',
    sortBy: 'createDate',
    sortDirection: 'DESC',
    createDate: daysAgo(1),
    userId: adminId.toString(),
    userEmail: adminUser.email,
  }
  const result = await db.collection('SavedReport').insertOne(doc)
  return { ...doc, _id: result.insertedId }
}
const savedReport = await findOrCreateSavedReport()
console.log('Saved report:', savedReport.reportId)

// ---------- 18. Notifications (a few unread ones for demo.manager, so the bell shows a badge) ----------
async function findOrCreateNotification(userId, type, title, message, link) {
  const existing = await db.collection('Notification').findOne({ userId: userId.toString(), title })
  if (existing) return existing
  const result = await db.collection('Notification').insertOne({
    userId: userId.toString(),
    type,
    title,
    message,
    link,
    read: false,
    createDate: daysAgo(1),
  })
  return result
}
await findOrCreateNotification(managerId, 'APPROVAL_REQUEST', 'Approval requested: Demo: New Server Purchase Request', 'Please review and decide', '/approvals')
await findOrCreateNotification(managerId, 'APPROVAL_REQUEST', `Approval requested: ${serviceRequest.requestId}`, catalogItem.name, '/approvals')
console.log('Notifications: 2 unread queued for demo.manager (log in as demo.manager to see the bell badge)')

// ---------- 19. Knowledge Base article (published, linked conceptually to the VPN incident) ----------
async function findOrCreateKnowledgeArticle() {
  const existing = await db.collection('KnowledgeArticle').findOne({ title: 'VPN Connection Troubleshooting Guide' })
  if (existing) return existing
  const seq = await nextSeq('KnowledgeArticleSequence', 'knowledge_article_sequence')
  const articleId = `KB-DEMO-${String(seq).padStart(3, '0')}`
  const doc = {
    articleId,
    title: 'VPN Connection Troubleshooting Guide',
    description: 'Steps to resolve common VPN connectivity issues:\n1. Restart the VPN client\n2. Check credentials have not expired\n3. Verify network connectivity\n4. Reinstall the VPN client if issues persist',
    category: 'Network',
    tags: ['vpn', 'network', 'troubleshooting'],
    status: 'PUBLISHED',
    visibility: 'INTERNAL',
    version: 1,
    viewCount: 12,
    helpfulCount: 8,
    notHelpfulCount: 1,
    authorId: adminId.toString(),
    authorName: adminUser.email,
    publishedDate: daysAgo(15),
    createDate: daysAgo(15),
    modifyDate: daysAgo(15),
    userId: adminId.toString(),
    userEmail: adminUser.email,
  }
  const result = await db.collection('KnowledgeArticle').insertOne(doc)
  return { ...doc, _id: result.insertedId }
}
const kbArticle = await findOrCreateKnowledgeArticle()
console.log('Knowledge Base article:', kbArticle.articleId)

console.log('\n=== Seed complete ===')
console.log('Demo login accounts (JWTs mint against these — see the testing document for how to log in):')
console.log('  demo.admin@eradesk-test.local     (ROLE_ADMIN)')
console.log('  demo.manager@eradesk-test.local   (ROLE_MODERATOR — has 1 pending approval + 1 pending service request approval)')
console.log('  demo.engineer@eradesk-test.local  (ROLE_ENGINEER)')
console.log('  demo.finance@eradesk-test.local   (ROLE_MODERATOR — second-step approver)')

await client.close()
