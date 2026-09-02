import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { isMailConfigured, getSupportEmail } from '@/lib/mailProvider'

async function get(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const settings = await auth.db.collection('EmailSettings').findOne({})

  return res.status(200).json({
    supportEmail: getSupportEmail(),
    subjectMarker: process.env.MAIL_SUBJECT_MARKER || '[Support]',
    gmailConfigured: isMailConfigured(),
    enabled: settings?.enabled ?? false,
    autoReplyEnabled: settings?.autoReplyEnabled ?? true,
    ackTemplate: settings?.ackTemplate || '',
    newTicketTemplate: settings?.newTicketTemplate || settings?.autoReplyTemplate || '',
    expiredTicketTemplate: settings?.expiredTicketTemplate || '',
    notSupportedTemplate: settings?.notSupportedTemplate || '',
    dlList: settings?.dlList || [],
  })
}

async function save(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const {
    enabled,
    autoReplyEnabled,
    ackTemplate,
    newTicketTemplate,
    expiredTicketTemplate,
    notSupportedTemplate,
    dlList,
  } = req.body || {}

  const cleanedDlList = Array.isArray(dlList)
    ? dlList.map((e) => String(e).trim()).filter(Boolean).slice(0, 6)
    : []

  await auth.db.collection('EmailSettings').updateOne(
    {},
    {
      $set: {
        enabled: !!enabled,
        autoReplyEnabled: !!autoReplyEnabled,
        ackTemplate: ackTemplate || '',
        newTicketTemplate: newTicketTemplate || '',
        expiredTicketTemplate: expiredTicketTemplate || '',
        notSupportedTemplate: notSupportedTemplate || '',
        dlList: cleanedDlList,
        modifyDate: new Date(),
      },
    },
    { upsert: true },
  )

  return res.status(200).json({ statusCode: 200, message: 'Email settings saved' })
}

export default {
  'get': get,
  'save': save,
}
