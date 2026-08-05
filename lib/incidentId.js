// Mirrors IncidentServiceImplementation.genrateIncidentId(): ddMMyy prefix + "LRSI0" + running counter,
// where the counter resets whenever the date prefix changes.
export async function generateIncidentId(db) {
  const lastIncident = await db.collection('Incident').findOne({}, { sort: { createDate: -1 } })

  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yy = String(now.getFullYear()).slice(2)
  const newPrefix = `${dd}${mm}${yy}`

  if (!lastIncident) {
    return `${newPrefix}LRSI01`
  }

  const lastId = lastIncident.incidentId
  const index = lastId.indexOf('LRSI0')
  if (index === -1) return null

  const textAfter = lastId.substring(index + 4)
  const textBefore = lastId.substring(0, index)

  if (newPrefix === textBefore) {
    const count = parseInt(textAfter, 10) + 1
    return `${textBefore}LRSI0${count}`
  }
  return `${newPrefix}LRSI01`
}
