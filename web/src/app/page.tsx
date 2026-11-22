import { DayView } from '@/components/DayView'
import { dayPage, latestDay } from '@/lib/data'
import { STALE_AFTER_HOURS } from '@/lib/site'

// Rebuilt at most every five minutes; the data changes once a day.
export const revalidate = 300

export default async function Today() {
  const day = await latestDay()
  const page = day ? await dayPage(day) : null
  if (!page) {
    return (
      <main className="page py-12">
        <h1 className="page-title">No digest yet</h1>
        <p className="prose-text mt-4 max-w-xl">The first one is written at 05:30 Central European Time. It will appear here by itself.</p>
      </main>
    )
  }
  const now = new Date()
  // Measured from when the briefing was written, or from the start of the day if there is none.
  const written = page.digest ? new Date(page.digest.updated_at) : new Date(`${page.day}T04:30:00Z`)
  const stale = now.getTime() - written.getTime() > STALE_AFTER_HOURS * 3_600_000
  return <DayView page={page} now={now} stale={stale} />
}
