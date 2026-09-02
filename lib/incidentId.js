// Mirrors IncidentServiceImplementation.genrateIncidentId(): ddMMyy prefix + "LRSI0" + running counter,
// where the counter resets whenever the date prefix changes.
export async function generateIncidentId(db) {
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yy = String(now.getFullYear()).slice(2)
  const newPrefix = `${dd}${mm}${yy}`

  // Only consider incidents whose id actually follows the ddMMyyLRSI0N scheme when looking for
  // "the last one" — picking the single most-recent-by-createDate document (the previous
  // approach) breaks permanently the moment any incident exists with a differently-formatted id
  // (e.g. a monitoring-sourced or imported incident), since that id has no LRSI0 counter to
  // continue from.
  const lastIncident = await db
    .collection('Incident')
    .findOne({ incidentId: { $regex: '^\\d{6}LRSI0\\d+$' } }, { sort: { createDate: -1 } })

  if (!lastIncident) {
    return `${newPrefix}LRSI01`
  }

  const lastId = lastIncident.incidentId
  const index = lastId.indexOf('LRSI0')

  const textAfter = lastId.substring(index + 4)
  const textBefore = lastId.substring(0, index)

  if (newPrefix === textBefore) {
    const count = parseInt(textAfter, 10) + 1
    return `${textBefore}LRSI0${count}`
  }
  return `${newPrefix}LRSI01`
}
