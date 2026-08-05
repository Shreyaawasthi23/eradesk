import { MongoClient, ObjectId } from 'mongodb'
const client = new MongoClient('mongodb://localhost:27017/lrs-eradesk')
await client.connect()
const db = client.db('lrs-eradesk')

const testIncidentId = new ObjectId('6a579e998baa4d14e8182d6f')
const incident = await db.collection('Incident').findOne({ _id: testIncidentId })
console.log('Found test incident:', incident?.incidentId)

const notes = await db.collection('IncidentNotes').deleteMany({ incidentId: '6a579e998baa4d14e8182d6f' })
const sla = await db.collection('SlaTracker').deleteMany({ incidentRefId: '6a579e998baa4d14e8182d6f' })
const points = await db.collection('UserPoints').deleteMany({
  createDate: { $gte: incident.createDate },
  remarks: { $regex: 'Incident', $options: 'i' },
  userId: '646e04431e125f530bcc16d8',
})
const inc = await db.collection('Incident').deleteOne({ _id: testIncidentId })

console.log('IncidentNotes deleted:', notes.deletedCount)
console.log('SlaTracker deleted:', sla.deletedCount)
console.log('UserPoints deleted:', points.deletedCount)
console.log('Incident deleted:', inc.deletedCount)

await client.close()
