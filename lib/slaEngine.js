// Business-hours-aware SLA deadline calculator. Given a start instant and a target duration in
// business minutes, walks forward day by day — skipping weekends/holidays and clamping to the
// configured working window — until the target minutes have been consumed, then returns the
// exact deadline instant. This is what spec section 67 calls out: "must correctly calculate the
// deadline across weekends and holidays."
//
// businessHours: { workDays: [0-6, 0=Sunday], startMinute: number (minutes since midnight),
//                   endMinute: number }
// holidaySet: Set of 'YYYY-MM-DD' date strings (in the business hours' local calendar)

const DAY_MS = 24 * 60 * 60 * 1000

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function minutesSinceMidnight(d) {
  return d.getHours() * 60 + d.getMinutes()
}

function isWorkDay(d, businessHours, holidaySet) {
  if (!businessHours.workDays.includes(d.getDay())) return false
  if (holidaySet.has(dateKey(d))) return false
  return true
}

// Clamps a point-in-time to the nearest business-hours window: if it falls before the day's
// start, moves to that day's start; if after the day's end (or on a non-work day), moves to the
// start of the next work day.
export function clampToBusinessWindow(date, businessHours, holidaySet) {
  let d = new Date(date)
  // Bounded loop: at most 8 days forward covers any single-week-off holiday run without risking
  // an infinite loop if configuration is somehow degenerate (e.g. workDays is empty).
  for (let i = 0; i < 8; i++) {
    if (!isWorkDay(d, businessHours, holidaySet)) {
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0)
      continue
    }
    const mins = minutesSinceMidnight(d)
    if (mins < businessHours.startMinute) {
      d.setHours(0, 0, 0, 0)
      d = new Date(d.getTime() + businessHours.startMinute * 60000)
      return d
    }
    if (mins >= businessHours.endMinute) {
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0)
      continue
    }
    return d
  }
  return d
}

// Returns the deadline Date such that exactly `targetMinutes` of business time elapse between
// `startDate` (clamped into business hours first) and the result.
export function calculateSlaDeadline(startDate, targetMinutes, businessHours, holidays) {
  const holidaySet = new Set((holidays || []).map((h) => (typeof h === 'string' ? h : dateKey(new Date(h)))))
  let cursor = clampToBusinessWindow(startDate, businessHours, holidaySet)
  let remaining = targetMinutes

  // Bounded to 3650 iterations (~10 years of work days) so a pathological input (e.g. a huge
  // target with a near-empty business-hours window) fails fast instead of hanging.
  for (let i = 0; i < 3650 && remaining > 0; i++) {
    const dayEndMinute = businessHours.endMinute
    const dayStart = new Date(cursor)
    dayStart.setHours(0, 0, 0, 0)
    const windowEnd = new Date(dayStart.getTime() + dayEndMinute * 60000)

    const availableMinutesToday = Math.max(0, Math.round((windowEnd.getTime() - cursor.getTime()) / 60000))

    if (remaining <= availableMinutesToday) {
      return new Date(cursor.getTime() + remaining * 60000)
    }

    remaining -= availableMinutesToday
    const nextDay = new Date(dayStart.getTime() + DAY_MS)
    cursor = clampToBusinessWindow(nextDay, businessHours, holidaySet)
  }

  return cursor
}

// Business minutes elapsed between two instants (used for "time spent so far" / breach checks),
// the inverse operation of calculateSlaDeadline.
export function businessMinutesBetween(startDate, endDate, businessHours, holidays) {
  const holidaySet = new Set((holidays || []).map((h) => (typeof h === 'string' ? h : dateKey(new Date(h)))))
  let cursor = clampToBusinessWindow(startDate, businessHours, holidaySet)
  const end = new Date(endDate)
  if (end <= cursor) return 0

  let total = 0
  for (let i = 0; i < 3650; i++) {
    const dayStart = new Date(cursor)
    dayStart.setHours(0, 0, 0, 0)
    const windowEnd = new Date(dayStart.getTime() + businessHours.endMinute * 60000)

    if (end <= windowEnd) {
      total += Math.max(0, Math.round((end.getTime() - cursor.getTime()) / 60000))
      return total
    }

    total += Math.max(0, Math.round((windowEnd.getTime() - cursor.getTime()) / 60000))
    const nextDay = new Date(dayStart.getTime() + DAY_MS)
    cursor = clampToBusinessWindow(nextDay, businessHours, holidaySet)
    if (cursor >= end) return total
  }
  return total
}

export const DEFAULT_BUSINESS_HOURS = {
  workDays: [1, 2, 3, 4, 5],
  startMinute: 9 * 60,
  endMinute: 18 * 60,
}
