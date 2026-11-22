// Calendar days and ISO weeks. A digest belongs to the day in Berlin on which
// its run started; days are plain 'YYYY-MM-DD' strings.

const berlin = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' })

export const berlinDay = (at: Date = new Date()): string => berlin.format(at)

const toUtc = (day: string): Date => new Date(`${day}T00:00:00Z`)
const fromUtc = (date: Date): string => date.toISOString().slice(0, 10)

export function addDays(day: string, n: number): string {
  const date = toUtc(day)
  date.setUTCDate(date.getUTCDate() + n)
  return fromUtc(date)
}

export interface Week {
  week: string // '2026-W47'
  start: string // Monday
  end: string // Sunday
}

// ISO 8601: weeks start on Monday and belong to the year of their Thursday.
export function isoWeek(day: string): Week {
  const date = toUtc(day)
  const weekday = (date.getUTCDay() + 6) % 7 // Monday = 0
  const start = addDays(day, -weekday)
  const thursday = toUtc(addDays(start, 3))
  const year = thursday.getUTCFullYear()
  const firstDay = Date.UTC(year, 0, 1)
  const number = Math.floor((thursday.getTime() - firstDay) / (7 * 86_400_000)) + 1
  return { week: `${year}-W${String(number).padStart(2, '0')}`, start, end: addDays(start, 6) }
}
