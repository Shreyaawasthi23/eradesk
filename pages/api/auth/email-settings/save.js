import { authenticate, hasAnyRole } from '@/lib/apiAuth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const { enabled, autoReplyEnabled, autoReplyTemplate, dlList } = req.body || {}

  const cleanedDlList = Array.isArray(dlList)
    ? dlList.map((e) => String(e).trim()).filter(Boolean).slice(0, 6)
    : []

  await auth.db.collection('EmailSettings').updateOne(
    {},
    {
      $set: {
        enabled: !!enabled,
        autoReplyEnabled: !!autoReplyEnabled,
        autoReplyTemplate: autoReplyTemplate || '',
        dlList: cleanedDlList,
        modifyDate: new Date(),
      },
    },
    { upsert: true },
  )

  return res.status(200).json({ statusCode: 200, message: 'Email settings saved' })
}
