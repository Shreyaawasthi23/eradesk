import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { parseMultipart } from '@/lib/multipart'

async function addRmaPod(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER'])) return res.status(403).end()

  const { id, userId } = req.query
  const { db } = auth

  const users = await db.collection('Users').findOne({ _id: new ObjectId(userId) })
  if (!users) {
    return res.status(200).json({ statusCode: 409, message: 'User not found!' })
  }

  const rma = await db.collection('Rma').findOne({ _id: new ObjectId(id) })
  if (!rma) {
    return res.status(200).json({ statusCode: 409, message: 'RMA not found!' })
  }

  const { files } = await parseMultipart(req)
  const podImage = files.podImage

  const existing = await db.collection('RmaPod').findOne({ rmaId: id })
  let message = null
  if (existing) {
    await db.collection('RmaPod').deleteOne({ _id: existing._id })
    message = 'POD Replaced'
    await db.collection('RmaChangeLog').insertOne({
      rmaId: rma.rmaId,
      userId: users._id.toString(),
      userName: users.username,
      remarks: `RMA #${rma.rmaId} POD Replaced by ${users.email}`,
      createDate: new Date(),
    })
  }

  await db.collection('RmaPod').insertOne({
    rmaNo: rma.rmaId,
    rmaId: id,
    image: {
      fileName: podImage.originalFilename,
      data: podImage.buffer.toString('base64'),
    },
    userId: users._id.toString(),
    userEmail: users.email,
    createDate: new Date(),
  })

  if (!existing) {
    await db.collection('RmaChangeLog').insertOne({
      rmaId: rma.rmaId,
      userId: users._id.toString(),
      userName: users.username,
      remarks: `RMA #${rma.rmaId} POD Uploaded by ${users.email}`,
      createDate: new Date(),
    })
  }

  return res.status(200).json({ statusCode: 200, message: message || 'Pod added successfully!' })
}

export default {
  'add-rma-pod': addRmaPod,
}
