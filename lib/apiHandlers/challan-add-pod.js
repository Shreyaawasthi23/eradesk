import { ObjectId } from 'mongodb'
import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { parseMultipart } from '@/lib/multipart'

async function addPod(req, res) {
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
    return res.status(200).json({ statusCode: 409, message: 'User Not Found!' })
  }

  const challan = await db.collection('DeliveryChallan').findOne({ _id: new ObjectId(id) })
  if (!challan) {
    return res.status(200).json({ statusCode: 409, message: 'Challan not found!' })
  }

  const { files } = await parseMultipart(req)
  const podImage = files.podImage

  const existing = await db.collection('PodDetails').findOne({ challanId: id })
  let message = null
  if (existing) {
    await db.collection('PodDetails').deleteOne({ _id: existing._id })
    message = 'POD Replaced'
    await db.collection('ChallanChangeLog').insertOne({
      challanNo: challan.challanNo,
      userId: users._id.toString(),
      userName: users.username,
      remarks: `Challan #${challan.challanNo} POD Replaced by ${users.email}`,
      createDate: new Date(),
    })
  }

  await db.collection('PodDetails').insertOne({
    challanNo: challan.challanNo,
    challanId: id,
    image: {
      fileName: podImage.originalFilename,
      data: podImage.buffer.toString('base64'),
    },
    userEmail: users.email,
    userId: users._id.toString(),
    createDate: new Date(),
  })

  if (!existing) {
    await db.collection('ChallanChangeLog').insertOne({
      challanNo: challan.challanNo,
      userId: users._id.toString(),
      userName: users.username,
      remarks: `Challan #${challan.challanNo} POD Uploaded by ${users.email}`,
      createDate: new Date(),
    })
  }

  return res.status(200).json({ statusCode: 200, message: message || 'Pod added successfully!' })
}

export default {
  'add-pod': addPod,
}
