import { generateIncidentId } from '@/lib/incidentId'
import { isGmailConfigured, listUnreadIncomingMessages, markMessageRead, sendReply } from '@/lib/gmail'
import { findMatchingClient, resolveSalesEmails } from '@/lib/clientMatch'

// Core email-to-incident logic, run automatically on a schedule (see
// pages/api/mail/poll.js) so every incoming email creates an incident with
// no manual step. If the sender matches a known FrontClient/EndClient (by
// email or domain), that client's Sales Team is CC'd on the auto-reply;
// otherwise the incident is still created, just with no Sales Team CC.
export async function pollSupportMailbox(db) {
  if (!isGmailConfigured()) {
    return { statusCode: 409, message: 'Gmail is not configured', created: 0 }
  }

  const settings = await db.collection('EmailSettings').findOne({})
  if (!settings?.enabled) {
    return { statusCode: 200, message: 'Email-to-incident is disabled', created: 0 }
  }

  const messages = await listUnreadIncomingMessages()

  let created = 0
  const results = []

  for (const message of messages) {
    try {
      const already = await db.collection('Incident').findOne({ sourceGmailId: message.gmailId })
      if (already) {
        await markMessageRead(message.gmailId)
        continue
      }

      const now = new Date()
      const incidentId = await generateIncidentId(db)

      const matchedClient = await findMatchingClient(db, message.senderEmail)
      const salesEmails = matchedClient ? await resolveSalesEmails(db, matchedClient.salesIds) : []

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
      created++
      results.push({ incidentId, from: message.senderEmail })
    } catch (error) {
      results.push({ error: error.message, from: message.senderEmail })
    }
  }

  return { statusCode: 200, message: `Processed ${messages.length} email(s)`, created, results }
}
