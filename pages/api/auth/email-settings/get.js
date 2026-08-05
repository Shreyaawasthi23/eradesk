import { authenticate, hasAnyRole } from '@/lib/apiAuth'
import { isGmailConfigured } from '@/lib/gmail'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).end()
  }

  const auth = await authenticate(req, res)
  if (!auth) return
  if (!hasAnyRole(auth.roles, ['ROLE_ADMIN'])) return res.status(403).end()

  const settings = await auth.db.collection('EmailSettings').findOne({})

  return res.status(200).json({
    supportEmail: process.env.GMAIL_SUPPORT_EMAIL || '',
    subjectMarker: process.env.MAIL_SUBJECT_MARKER || '[Support]',
    gmailConfigured: isGmailConfigured(),
    enabled: settings?.enabled ?? false,
    autoReplyEnabled: settings?.autoReplyEnabled ?? true,
    autoReplyTemplate: settings?.autoReplyTemplate || '',
    dlList: settings?.dlList || [],
  })
}
