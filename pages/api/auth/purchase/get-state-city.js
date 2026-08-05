import { authenticate, hasAnyRole } from '@/lib/apiAuth'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN', 'ROLE_MODERATOR', 'ROLE_USER'])) return res.status(403).end()

  const { pincode } = req.query

  try {
    const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`)
    const [data] = await response.json()
    const postOffice = data.PostOffice[0]

    return res.status(200).json({ city: postOffice.District, state: postOffice.State })
  } catch {
    return res.status(200).json(null)
  }
}
