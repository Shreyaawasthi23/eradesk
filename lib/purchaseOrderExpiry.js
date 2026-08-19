// Flips any active Purchase Order whose endDate has passed to status:false,
// mirroring the manual "Expire" action (see pages/api/auth/purchase/po-expired.js).
export async function expirePastDuePurchaseOrders(db) {
  const now = new Date()
  const result = await db.collection('PurchaseOrder').updateMany(
    { status: true, endDate: { $ne: null, $lt: now } },
    { $set: { status: false, modifyDate: now } },
  )
  return { statusCode: 200, message: `Expired ${result.modifiedCount} purchase order(s)`, expired: result.modifiedCount }
}
