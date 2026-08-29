// Text-matching helpers for the email-to-incident decision flow:
// does the email reference an existing case (incidentId), and if not,
// does it mention a serial number we have in inventory?

const INCIDENT_ID_PATTERN = /\b\d{6}LRSI0\d+\b/i

// Looks for our own incidentId format (ddmmyyLRSI0N) anywhere in the
// subject or body. Case-insensitive since mail clients sometimes alter case.
export function findCaseIdInText(subject, body) {
  const haystack = `${subject || ''}\n${body || ''}`
  const match = haystack.match(INCIDENT_ID_PATTERN)
  return match ? match[0].toUpperCase() : null
}

// Looks for any known Assets.serialNumber as a whole word in the email
// text. Checks the longest serials first so a short serial that happens to
// be a substring of a longer one doesn't false-match ahead of the real one.
export function findSerialInText(subject, body, knownSerials) {
  const haystack = `${subject || ''}\n${body || ''}`.toUpperCase()
  const sorted = [...knownSerials].sort((a, b) => b.length - a.length)
  for (const serial of sorted) {
    if (!serial) continue
    const escaped = serial.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const wordBoundary = new RegExp(`\\b${escaped}\\b`, 'i')
    if (wordBoundary.test(haystack)) return serial
  }
  return null
}
