import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const { userId } = req.query
  const ids = req.body || []
  const { db } = auth

  const user = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  if (!ids.length || !user) {
    return res.status(200).json({ statusCode: 409, message: 'Asset Not Found' })
  }

  let count = 0
  for (const id of ids) {
    await db.collection('Assets').deleteOne({ _id: new ObjectId(id) })
    count++
  }

  await db.collection('AssetsChangeLog').insertOne({
    remarks: `Deleted ${count} Assets`,
    createDate: new Date(),
  })

  return res.status(200).json({ statusCode: 200, message: `${count} Assets deleted successfully!` })
}
