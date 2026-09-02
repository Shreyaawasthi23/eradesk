// Shared in-app notification writer. Call from any API route after an event a user should see
// in their notification bell (assignment, approval request, SLA warning, expiry, etc).
// Non-blocking by design (failures are swallowed) so a notification hiccup never breaks the
// actual operation that triggered it — mirrors lib/auditLog.js's logAudit().
export async function notifyUser(db, { userId, type, title, message, link }) {
  if (!userId) return
  try {
    await db.collection('Notification').insertOne({
      userId: String(userId),
      type,
      title,
      message: message || '',
      link: link || null,
      read: false,
      createDate: new Date(),
    })
  } catch (e) {
    console.error('notification write failed:', e.message)
  }
}

// Fan-out helper for notifying several recipients about the same event (e.g. all approvers
// on a PARALLEL approval request, or every admin when a change is submitted to CAB).
export async function notifyUsers(db, userIds, payload) {
  await Promise.all([...new Set((userIds || []).filter(Boolean).map(String))].map((userId) =>
    notifyUser(db, { ...payload, userId }),
  ))
}
