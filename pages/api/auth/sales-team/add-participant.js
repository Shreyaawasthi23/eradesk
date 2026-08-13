import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const { name, email, number, userId, status } = req.body || {}
  const { db } = auth

  const existingUser = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  if (!existingUser) {
    return res.status(200).json({ statusCode: 409, message: 'User not found!' })
  }

  await db.collection('SalesTeam').insertOne({
    name,
    email,
    number,
    status: status === undefined ? true : status === true || status === 'true',
    createDate: new Date(),
    userEmail: existingUser.email,
  })

  return res.status(200).json({ statusCode: 200, message: 'Participant added to Sales Team Successfully!' })
}
