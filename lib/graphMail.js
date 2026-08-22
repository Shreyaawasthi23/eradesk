import { ConfidentialClientApplication } from '@azure/msal-node'

// Microsoft Graph API client for the shared support mailbox
// (support@lrsservices.in), authenticated via an Azure AD app registration
// using the client-credentials flow (app-only permissions: Mail.Read,
// Mail.Send — see project notes for the Azure AD setup). This isn't a
// per-user OAuth flow, it's one fixed mailbox the whole app polls, same
// role lib/gmail.js played for the previous Gmail-based mailbox.
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'

export function isGraphMailConfigured() {
  return Boolean(
    process.env.GRAPH_TENANT_ID &&
      process.env.GRAPH_CLIENT_ID &&
      process.env.GRAPH_CLIENT_SECRET &&
      process.env.GRAPH_MAILBOX,
  )
}

let cachedApp = null
function getMsalApp() {
  if (cachedApp) return cachedApp
  const tenantId = process.env.GRAPH_TENANT_ID
  const clientId = process.env.GRAPH_CLIENT_ID
  const clientSecret = process.env.GRAPH_CLIENT_SECRET

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      'Microsoft Graph mail is not configured: set GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, GRAPH_MAILBOX',
    )
  }

  cachedApp = new ConfidentialClientApplication({
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      clientSecret,
    },
  })
  return cachedApp
}

async function getAccessToken() {
  const app = getMsalApp()
  const result = await app.acquireTokenByClientCredential({
    scopes: ['https://graph.microsoft.com/.default'],
  })
  return result.accessToken
}

function getMailbox() {
  const mailbox = process.env.GRAPH_MAILBOX
  if (!mailbox) throw new Error('GRAPH_MAILBOX is not set')
  return mailbox
}

async function graphFetch(path, options = {}) {
  const token = await getAccessToken()
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Graph API ${options.method || 'GET'} ${path} failed: ${res.status} ${text}`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

function isAutomatedBounce(senderEmail) {
  const email = (senderEmail || '').toLowerCase()
  return email.startsWith('mailer-daemon@') || email.startsWith('postmaster@')
}

function addressListFromRecipients(recipients) {
  return (recipients || [])
    .map((r) => r.emailAddress?.address)
    .filter(Boolean)
}

function toMessageShape(msg) {
  const senderEmail = msg.from?.emailAddress?.address || ''
  const senderName = msg.from?.emailAddress?.name || senderEmail

  return {
    graphId: msg.id,
    threadId: msg.conversationId,
    subject: msg.subject || '',
    senderEmail,
    senderName,
    toEmails: addressListFromRecipients(msg.toRecipients),
    ccEmails: addressListFromRecipients(msg.ccRecipients),
    messageIdHeader: msg.internetMessageId || '',
    body: (msg.bodyPreview || '').trim(),
  }
}

// Lists unread messages in the inbox, oldest first, excluding anything sent
// by the mailbox itself and mailer-daemon/postmaster bounce notifications —
// mirrors the filtering lib/gmail.js applied for the previous mailbox.
export async function listUnreadIncomingMessages() {
  const mailbox = getMailbox()
  const params = new URLSearchParams({
    $filter: 'isRead eq false',
    $orderby: 'receivedDateTime asc',
    $top: '50',
    $select: 'id,conversationId,subject,from,toRecipients,ccRecipients,internetMessageId,bodyPreview',
  })

  const data = await graphFetch(
    `/users/${encodeURIComponent(mailbox)}/mailFolders/inbox/messages?${params.toString()}`,
  )

  return (data.value || [])
    .map(toMessageShape)
    .filter((m) => m.senderEmail.toLowerCase() !== mailbox.toLowerCase() && !isAutomatedBounce(m.senderEmail))
}

export async function markMessageRead(graphId) {
  const mailbox = getMailbox()
  await graphFetch(`/users/${encodeURIComponent(mailbox)}/messages/${graphId}`, {
    method: 'PATCH',
    body: JSON.stringify({ isRead: true }),
  })
}

export async function sendReply({ to, cc, bcc, subject, body, inReplyTo }) {
  const mailbox = getMailbox()
  const toList = [to].flat().filter(Boolean)
  const ccList = Array.isArray(cc) ? cc.filter(Boolean) : cc ? [cc] : []
  const bccList = Array.isArray(bcc) ? bcc.filter(Boolean) : bcc ? [bcc] : []

  await graphFetch(`/users/${encodeURIComponent(mailbox)}/sendMail`, {
    method: 'POST',
    body: JSON.stringify({
      message: {
        subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
        body: { contentType: 'Text', content: body },
        toRecipients: toList.map((address) => ({ emailAddress: { address } })),
        ccRecipients: ccList.map((address) => ({ emailAddress: { address } })),
        bccRecipients: bccList.map((address) => ({ emailAddress: { address } })),
      },
      saveToSentItems: true,
    }),
  })
  // Note: inReplyTo isn't wired into Graph's sendMail threading headers here
  // — Graph doesn't expose raw MIME headers via sendMail the way Gmail's
  // raw-message API did. Replies still land in Outlook's own conversation
  // grouping via subject/participants, just not a forced In-Reply-To header.
  void inReplyTo
}
