import { google } from 'googleapis'

// Gmail API client for the shared support mailbox. Auth is a single refresh
// token obtained once via scripts/gmail-auth.mjs — this isn't a per-user
// OAuth flow, it's one fixed mailbox the whole app polls.
function getOAuthClient() {
  const clientId = process.env.GMAIL_CLIENT_ID
  const clientSecret = process.env.GMAIL_CLIENT_SECRET
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Gmail is not configured: set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN',
    )
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  return oauth2Client
}

export function isGmailConfigured() {
  return Boolean(
    process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN,
  )
}

function getGmailClient() {
  return google.gmail({ version: 'v1', auth: getOAuthClient() })
}

function decodeBase64Url(data) {
  if (!data) return ''
  return Buffer.from(data, 'base64').toString('utf-8')
}

const HTML_ENTITIES = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
}

function htmlToText(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<(br|p|div|tr|li|h[1-6])[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, (entity) => HTML_ENTITIES[entity.toLowerCase()] ?? ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim()
}

// Prefers the plain-text part of a message; falls back to converting the
// HTML part to readable text (stripping tags/styles/scripts and decoding
// entities) rather than storing raw markup as the incident's problem field.
function extractBody(payload) {
  if (!payload) return ''

  if (Array.isArray(payload.parts) && payload.parts.length) {
    const plainPart = payload.parts.find((p) => p.mimeType === 'text/plain')
    if (plainPart?.body?.data) return decodeBase64Url(plainPart.body.data).trim()

    const htmlPart = payload.parts.find((p) => p.mimeType === 'text/html')
    if (htmlPart?.body?.data) return htmlToText(decodeBase64Url(htmlPart.body.data))

    for (const part of payload.parts) {
      const nested = extractBody(part)
      if (nested) return nested
    }
    return ''
  }

  if (payload.body?.data) {
    const raw = decodeBase64Url(payload.body.data)
    return payload.mimeType === 'text/html' ? htmlToText(raw) : raw.trim()
  }

  return ''
}

function getHeader(headers, name) {
  return headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || ''
}

function parseSenderEmail(fromHeader) {
  const match = fromHeader.match(/<([^>]+)>/)
  if (match) return match[1].trim()
  return fromHeader.trim()
}

function parseSenderName(fromHeader) {
  const match = fromHeader.match(/^(.*?)</)
  if (match && match[1].trim()) return match[1].trim().replace(/"/g, '')
  return parseSenderEmail(fromHeader)
}

function toMessageShape(full) {
  const headers = full.payload?.headers || []
  const fromHeader = getHeader(headers, 'From')

  return {
    gmailId: full.id,
    threadId: full.threadId,
    subject: getHeader(headers, 'Subject'),
    from: fromHeader,
    senderEmail: parseSenderEmail(fromHeader),
    senderName: parseSenderName(fromHeader),
    messageIdHeader: getHeader(headers, 'Message-ID'),
    date: getHeader(headers, 'Date'),
    body: extractBody(full.payload).trim(),
  }
}

// Lists unread messages in the inbox, oldest first, excluding anything the
// mailbox itself sent (so auto-replies don't get reprocessed as new mail).
export async function listUnreadIncomingMessages() {
  const gmail = getGmailClient()

  const query = 'is:unread in:inbox -from:me'

  const list = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 50,
  })

  const ids = (list.data.messages || []).map((m) => m.id).reverse()
  const messages = []

  for (const id of ids) {
    const full = await gmail.users.messages.get({ userId: 'me', id, format: 'full' })
    messages.push(toMessageShape(full.data))
  }

  return messages
}

// Fetches a single message by id, in the same shape as listUnreadIncomingMessages.
// Used to re-fetch a message an admin approved from the unmatched-sender review
// popup, since nothing is cached across that request round-trip.
export async function getMessageById(gmailId) {
  const gmail = getGmailClient()
  try {
    const full = await gmail.users.messages.get({ userId: 'me', id: gmailId, format: 'full' })
    return toMessageShape(full.data)
  } catch (error) {
    if (error.code === 404) return null
    throw error
  }
}

export async function markMessageRead(gmailId) {
  const gmail = getGmailClient()
  await gmail.users.messages.modify({
    userId: 'me',
    id: gmailId,
    requestBody: { removeLabelIds: ['UNREAD'] },
  })
}

function buildRawMessage({ to, cc, bcc, subject, body, inReplyTo, references }) {
  const headers = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
  ]
  if (cc) headers.push(`Cc: ${cc}`)
  if (bcc) headers.push(`Bcc: ${bcc}`)
  if (inReplyTo) headers.push(`In-Reply-To: ${inReplyTo}`)
  if (references) headers.push(`References: ${references}`)

  const message = `${headers.join('\r\n')}\r\n\r\n${body}`
  return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_')
}

export async function sendReply({ to, cc, bcc, subject, body, threadId, inReplyTo }) {
  const gmail = getGmailClient()
  const raw = buildRawMessage({
    to,
    cc: Array.isArray(cc) ? cc.filter(Boolean).join(', ') : cc,
    bcc: Array.isArray(bcc) ? bcc.filter(Boolean).join(', ') : bcc,
    subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
    body,
    inReplyTo,
    references: inReplyTo,
  })

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw, threadId },
  })
}
