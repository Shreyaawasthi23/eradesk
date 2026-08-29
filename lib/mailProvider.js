import * as gmail from '@/lib/gmail'
import * as graphMail from '@/lib/graphMail'

// Switches which mailbox integration the app polls/sends through, without
// deleting either implementation. Set MAIL_PROVIDER=gmail to use the
// original testsn1998@gmail.com pipeline (lib/gmail.js), or
// MAIL_PROVIDER=graph (default) to use the support@lrsservices.in
// Microsoft Graph pipeline (lib/graphMail.js). Switching providers is a
// one-line env var change + restart — no code edits needed.
function getProviderName() {
  return (process.env.MAIL_PROVIDER || 'graph').toLowerCase()
}

function getProvider() {
  return getProviderName() === 'gmail' ? gmail : graphMail
}

export function isMailConfigured() {
  const provider = getProvider()
  return provider === gmail ? provider.isGmailConfigured() : provider.isGraphMailConfigured()
}

export function getSupportEmail() {
  return getProviderName() === 'gmail'
    ? process.env.GMAIL_SUPPORT_EMAIL || ''
    : process.env.GRAPH_MAILBOX || ''
}

// Which Incident field name to store the provider's message ID under —
// kept distinct per provider (rather than a single shared field) so
// existing incidents created under either provider stay correctly tagged.
export function getSourceIdField() {
  return getProviderName() === 'gmail' ? 'sourceGmailId' : 'sourceGraphId'
}

// Normalizes each provider's message shape to a common `messageId` field
// (Gmail's `gmailId` / Graph's `graphId`) so callers don't need to branch
// on which provider is active.
export async function listUnreadIncomingMessages() {
  const messages = await getProvider().listUnreadIncomingMessages()
  return messages.map((m) => ({ ...m, messageId: m.gmailId ?? m.graphId }))
}

export async function markMessageRead(messageId) {
  return getProvider().markMessageRead(messageId)
}

export async function sendReply(args) {
  return getProvider().sendReply(args)
}
