import type { StoryLink } from './types'

// Days are plain 'YYYY-MM-DD' strings, weeks 'YYYY-Www'. Everything is
// formatted in UTC from the calendar date, so the server's zone never shifts a day.

const at = (day: string): Date => new Date(`${day}T00:00:00Z`)

const LONG = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const MEDIUM = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
const DAY_MONTH = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' })
const DAY_MONTH_YEAR = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const MONTH_YEAR = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const BERLIN = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' })

export function isDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = at(value)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export const isWeek = (value: string): boolean => /^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/.test(value)

// "Sunday 22 November 2026"
export const longDay = (day: string): string => LONG.format(at(day)).replace(',', '')
// "Sun 22 Nov"
export const mediumDay = (day: string): string => MEDIUM.format(at(day)).replace(',', '')
// "November 2026", for grouping the archive
export const monthOf = (day: string): string => MONTH_YEAR.format(at(day))

// "16 to 22 November 2026", "30 November to 6 December 2026"
export function weekRange(start: string, end: string): string {
  const sameMonth = start.slice(0, 7) === end.slice(0, 7)
  const from = sameMonth ? String(at(start).getUTCDate()) : DAY_MONTH.format(at(start))
  return `${from} to ${DAY_MONTH_YEAR.format(at(end))}`
}

// "Week 47"
export const weekName = (week: string): string => `Week ${Number(week.slice(6))}`

export const berlinDay = (now: Date): string => BERLIN.format(now)

// "3 hours ago", "2 days ago"
export function ago(iso: string, now: Date): string {
  const minutes = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60_000))
  if (minutes < 90) return minutes <= 1 ? 'just now' : `${minutes} minutes ago`
  const hours = Math.round(minutes / 60)
  if (hours < 36) return `${hours} hours ago`
  return `${Math.round(hours / 24)} days ago`
}

// "OpenAI, The Verge and Hacker News"
export function listing(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

// Where a link in a story's source list leads: the report itself, or for a
// community post the discussion, since its address is the article already listed.
export const linkTarget = (link: StoryLink, all: StoryLink[]): string =>
  link.discussion && all.some((other) => other !== link && other.url === link.url) ? link.discussion : link.url

// One entry per outlet for a story's "Reported by" line: an outlet that wrote
// twice about the same event is named once, with its first report.
export function outletsOf(links: StoryLink[]): StoryLink[] {
  const seen = new Set<string>()
  return links.filter((link) => !seen.has(link.source) && seen.add(link.source))
}

// Only web addresses become links, whatever the database holds.
export const safeHref = (url: string): string | null => (/^https?:\/\//i.test(url) ? url : null)
