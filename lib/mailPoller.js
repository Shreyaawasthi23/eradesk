import { generateIncidentId } from '@/lib/incidentId'
import { isMailConfigured, getSupportEmail, getSourceIdField, listUnreadIncomingMessages, markMessageRead, sendReply } from '@/lib/mailProvider'
import { findMatchingSalesIds, resolveSalesEmails } from '@/lib/clientMatch'
import { findCaseIdInText, findSerialInText } from '@/lib/mailFlowMatch'

const DEFAULT_ACK_TEMPLATE =
  'Hi {{name}},\n\nThank you for your update on incident {{incidentId}}. Our team has received it and will get back to you shortly.\n\nRegards,\nSupport Team'

const DEFAULT_NEW_TICKET_TEMPLATE =
  'Hi {{name}},\n\nThank you for contacting support. Your incident has been logged with reference {{incidentId}}. Our team will get back to you shortly.\n\nRegards,\nSupport Team'

const DEFAULT_EXPIRED_TICKET_TEMPLATE =
  'Hi {{name}},\n\nThank you for contacting support. Your incident has been logged with reference {{incidentId}}. Please note the AMC/support contract for serial number {{serialNumber}} has expired — our team will reach out regarding renewal along with resolving this request.\n\nRegards,\nSupport Team'

const DEFAULT_NOT_SUPPORTED_TEMPLATE =
  'Hi {{name}},\n\nThank you for reaching out. We could not find serial number {{serialNumber}} under our AMC/support coverage, so no incident has been created. Please contact our sales team for support options.\n\nRegards,\nSupport Team'

function fillTemplate(template, { name, incidentId, serialNumber }) {
  return template
    .replace(/{{name}}/g, name || 'there')
    .replace(/{{incidentId}}/g, incidentId || '')
    .replace(/{{serialNumber}}/g, serialNumber || '')
}

// Everyone the client originally addressed (To + CC, minus the support
// mailbox itself and the sender, who's already in "To") stays on the
// thread, alongside any matched client's Sales Team.
function buildCcList(message, supportEmail, salesEmails) {
  const originalRecipients = [...message.toEmails, ...message.ccEmails]
    .map((e) => e.toLowerCase())
    .filter((e) => e && e !== supportEmail && e !== message.senderEmail.toLowerCase())
  return Array.from(new Set([...originalRecipients, ...salesEmails]))
}

// Core email-to-incident logic, run automatically on a schedule (see
// pages/api/mail/poll.js). Follows this decision flow:
//
//   1. Case ID (our own incidentId format) found in subject/body?
//        YES -> send an acknowledgement reply, no new incident. The DL
//               list (SDM/Helpdesk) is notified via bcc; the Sales Team
//               is NOT cc'd on this reply since it's just a follow-up on
//               an existing case.
//        NO  -> continue to step 2.
//   2. Does the email mention a serial number that exists in Assets?
//        YES -> create a new incident. If that serial's linked Purchase
//               Order has expired (status:false / past endDate), send the
//               "expired" reply; otherwise send the normal "new ticket"
//               reply. Either way the Sales Team is cc'd.
//        NO  -> no incident is created. Send the "not supported" reply,
//               still cc'ing the Sales Team so they're aware.
//
// In every branch, replies within a thread that already produced an
// incident are skipped entirely (no duplicate incident/reply) — this is
// checked before the Case ID / serial branching above.
export async function pollSupportMailbox(db) {
  if (!isMailConfigured()) {
    return { statusCode: 409, message: 'Mailbox is not configured', created: 0 }
  }

  const settings = await db.collection('EmailSettings').findOne({})
  if (!settings?.enabled) {
    return { statusCode: 200, message: 'Email-to-incident is disabled', created: 0 }
  }

  const supportEmail = getSupportEmail().toLowerCase()
  const messages = await listUnreadIncomingMessages()

  let created = 0
  const results = []

  for (const message of messages) {
    try {
      // Already processed this exact message (either provider's field).
      const already = await db.collection('Incident').findOne({
        $or: [{ sourceGmailId: message.messageId }, { sourceGraphId: message.messageId }],
      })
      if (already) {
        await markMessageRead(message.messageId)
        continue
      }

      // A reply within a thread that already has an incident — skip it
      // entirely (no new incident, no auto-reply), just mark it read.
      const threadAlready = await db
        .collection('Incident')
        .findOne({ sourceThreadId: message.threadId })
      if (threadAlready) {
        await markMessageRead(message.messageId)
        continue
      }

      const now = new Date()
      const matchedSalesIds = await findMatchingSalesIds(db, message.senderEmail)
      const salesEmails = await resolveSalesEmails(db, matchedSalesIds)

      // Step 1: is an existing case referenced in the subject/body?
      const caseId = findCaseIdInText(message.subject, message.body)
      if (caseId) {
        const existingIncident = await db.collection('Incident').findOne({ incidentId: caseId })

        await db.collection('IncidentNotes').insertOne({
          incidentId: caseId,
          note: `Customer email received (no new incident created — existing case referenced): ${message.subject || '(no subject)'}`,
          userEmail: message.senderEmail,
          createDate: now,
          additionalDetails: (message.body || '').slice(0, 2000),
        })

        if (settings.autoReplyEnabled) {
          const template = settings.ackTemplate || DEFAULT_ACK_TEMPLATE
          const body = fillTemplate(template, { name: message.senderName, incidentId: caseId })
          // Original To/Cc recipients stay on the thread; the Sales Team is
          // deliberately not added on an acknowledgement reply.
          const ccList = buildCcList(message, supportEmail, [])
          await sendReply({
            to: message.senderEmail,
            cc: ccList,
            bcc: settings.dlList,
            subject: message.subject || `Update on ${caseId}`,
            body,
            threadId: message.threadId,
            inReplyTo: message.messageIdHeader,
          })
        }

        await markMessageRead(message.messageId)
        results.push({ incidentId: existingIncident?.incidentId || caseId, from: message.senderEmail, action: 'acknowledged' })
        continue
      }

      // Step 2: does the email mention a serial number we have in inventory?
      const allSerials = await db
        .collection('Assets')
        .distinct('serialNumber', { serialNumber: { $exists: true, $ne: '' } })
      const matchedSerial = findSerialInText(message.subject, message.body, allSerials)

      if (!matchedSerial) {
        // Serial not recognized — no incident, just a "not supported" reply
        // (still cc'ing Sales Team so they're aware of the contact).
        if (settings.autoReplyEnabled) {
          const template = settings.notSupportedTemplate || DEFAULT_NOT_SUPPORTED_TEMPLATE
          const body = fillTemplate(template, { name: message.senderName })
          const ccList = buildCcList(message, supportEmail, salesEmails)
          await sendReply({
            to: message.senderEmail,
            cc: ccList,
            bcc: settings.dlList,
            subject: message.subject || 'Support request received',
            body,
            threadId: message.threadId,
            inReplyTo: message.messageIdHeader,
          })
        }
        await markMessageRead(message.messageId)
        results.push({ from: message.senderEmail, action: 'not_supported' })
        continue
      }

      // Serial recognized — create a new incident, and check whether its
      // linked Purchase Order has expired to pick the right reply.
      const asset = await db.collection('Assets').findOne({ serialNumber: matchedSerial })
      let poExpired = false
      if (asset?.purchaseOrderNumber) {
        const po = await db
          .collection('PurchaseOrder')
          .findOne({ purchaseOrderNumber: asset.purchaseOrderNumber })
        if (po) {
          poExpired = po.status === false || (po.endDate && new Date(po.endDate) < now)
        }
      }

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
        [getSourceIdField()]: message.messageId,
        sourceThreadId: message.threadId,
        sourceSubject: message.subject,
        serialNumber: matchedSerial,
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
        const template = poExpired
          ? settings.expiredTicketTemplate || DEFAULT_EXPIRED_TICKET_TEMPLATE
          : settings.newTicketTemplate || DEFAULT_NEW_TICKET_TEMPLATE
        const body = fillTemplate(template, {
          name: message.senderName,
          incidentId,
          serialNumber: matchedSerial,
        })
        const ccList = buildCcList(message, supportEmail, salesEmails)

        await sendReply({
          to: message.senderEmail,
          cc: ccList,
          bcc: settings.dlList,
          subject: message.subject || 'Support request received',
          body,
          threadId: message.threadId,
          inReplyTo: message.messageIdHeader,
        })
      }

      await markMessageRead(message.messageId)
      created++
      results.push({ incidentId, from: message.senderEmail, action: poExpired ? 'created_expired' : 'created' })
    } catch (error) {
      results.push({ error: error.message, from: message.senderEmail })
    }
  }

  return { statusCode: 200, message: `Processed ${messages.length} email(s)`, created, results }
}
