import { generateIncidentId } from '@/lib/incidentId'
import {
  isGmailConfigured,
  listUnreadIncomingMessages,
  getMessageById,
  markMessageRead,
  sendReply,
} from '@/lib/gmail'
import { findMatchingClient, resolveSalesEmails } from '@/lib/clientMatch'

// Creates one incident (+ SLA row + optional auto-reply) from a fetched Gmail
// message and marks it read. Shared by the auto-create path (matched client)
// and the admin-confirmed path (unmatched sender, manually approved).
async function createIncidentFromMessage(db, settings, message, salesEmails) {
  const already = await db.collection('Incident').findOne({ sourceGmailId: message.gmailId })
  if (already) {
    await markMessageRead(message.gmailId)
    return { incidentId: already.incidentId, from: message.senderEmail, skipped: 'already processed' }
  }

  const now = new Date()
  const incidentId = await generateIncidentId(db)

  const newIncident = {
    incidentId,
    incidentDate: now,
    problem: (message.body || message.subject || '(no content)').slice(0, 2000),
    status: 'NEED TO PLAN ENGINEER',
    contactName: message.senderName,
    contactEmail: message.senderEmail,
    contactNumber: '',
    source: 'EMAIL',
    sourceGmailId: message.gmailId,
    sourceSubject: message.subject,
    createDate: now,
    modifyDate: now,
    userEmail: message.senderEmail,
  }

  const result = await db.collection('Incident').insertOne(newIncident)

  await db.collection('SlaTracker').insertOne({
    incidentId,
    incidentRefId: result.insertedId.toString(),
    status: 'NEED TO PLAN ENGINEER',
    createDate: now,
    userEmail: message.senderEmail,
  })

  if (settings.autoReplyEnabled) {
    const template =
      settings.autoReplyTemplate ||
      'Hi {{name}},\n\nThank you for contacting support. Your incident has been logged with reference {{incidentId}}. Our team will get back to you shortly.\n\nRegards,\nSupport Team'

    const body = template
      .replace(/{{name}}/g, message.senderName || 'there')
      .replace(/{{incidentId}}/g, incidentId)

    await sendReply({
      to: message.senderEmail,
      cc: salesEmails,
      bcc: settings.dlList,
      subject: message.subject || 'Support request received',
      body,
      threadId: message.threadId,
      inReplyTo: message.messageIdHeader,
    })
  }

  await markMessageRead(message.gmailId)
  return { incidentId, from: message.senderEmail }
}

// Core email-to-incident logic, shared by the secret-guarded background poll
// endpoint and the admin UI's "Check Mailbox Now" trigger. Messages from a
// sender that matches a known FrontClient/EndClient (by email or domain) are
// turned into incidents immediately. Messages from unrecognized senders are
// left unread and returned in `pendingReview` instead of being skipped
// silently — an admin decides via the review popup (confirmPendingMessages)
// whether any of them should still become incidents.
export async function pollSupportMailbox(db) {
  if (!isGmailConfigured()) {
    return { statusCode: 409, message: 'Gmail is not configured', created: 0, pendingReview: [] }
  }

  const settings = await db.collection('EmailSettings').findOne({})
  if (!settings?.enabled) {
    return { statusCode: 200, message: 'Email-to-incident is disabled', created: 0, pendingReview: [] }
  }

  const messages = await listUnreadIncomingMessages()

  let created = 0
  const results = []
  const pendingReview = []

  for (const message of messages) {
    try {
      const already = await db.collection('Incident').findOne({ sourceGmailId: message.gmailId })
      if (already) {
        await markMessageRead(message.gmailId)
        continue
      }

      const matchedClient = await findMatchingClient(db, message.senderEmail)

      if (!matchedClient) {
        pendingReview.push({
          gmailId: message.gmailId,
          from: message.senderEmail,
          senderName: message.senderName,
          subject: message.subject,
          snippet: (message.body || '').slice(0, 200),
        })
        continue
      }

      const salesEmails = await resolveSalesEmails(db, matchedClient.salesIds)
      const outcome = await createIncidentFromMessage(db, settings, message, salesEmails)
      created++
      results.push(outcome)
    } catch (error) {
      results.push({ error: error.message, from: message.senderEmail })
    }
  }

  return {
    statusCode: 200,
    message: `Processed ${messages.length} email(s)`,
    created,
    results,
    pendingReview,
  }
}

// Called after the admin reviews the unmatched-sender popup and ticks which
// ones to convert. Re-fetches each message by id (nothing was cached across
// the request) and creates incidents for the approved ones only; the rest
// stay unread in the inbox for a future review.
export async function confirmPendingMessages(db, gmailIds) {
  if (!isGmailConfigured()) {
    return { statusCode: 409, message: 'Gmail is not configured', created: 0 }
  }

  const settings = await db.collection('EmailSettings').findOne({})
  if (!settings?.enabled) {
    return { statusCode: 200, message: 'Email-to-incident is disabled', created: 0 }
  }

  let created = 0
  const results = []

  for (const gmailId of gmailIds || []) {
    try {
      const message = await getMessageById(gmailId)
      if (!message) {
        results.push({ error: 'Message not found', gmailId })
        continue
      }

      // No client match required here — the admin already approved it manually.
      const outcome = await createIncidentFromMessage(db, settings, message, [])
      created++
      results.push(outcome)
    } catch (error) {
      results.push({ error: error.message, gmailId })
    }
  }

  return { statusCode: 200, message: `Created ${created} incident(s)`, created, results }
}
