import type { Metadata } from 'next'
import Link from 'next/link'
import { days } from '@/lib/data'
import { mediumDay, monthOf } from '@/lib/format'
import type { DayEntry } from '@/lib/types'

export const revalidate = 300

export const metadata: Metadata = { title: 'Archive', description: 'Every daily digest, newest first.', alternates: { canonical: '/archive' } }

export default async function Archive() {
  const all = await days()
  const months = new Map<string, DayEntry[]>()
  for (const entry of all) {
    const month = monthOf(entry.day)
    months.set(month, [...(months.get(month) ?? []), entry])
  }

  return (
    <main className="page py-10">
      <h1 className="page-title">Archive</h1>
      {all.length === 0 && <p className="prose-text mt-4">No digest has been written yet.</p>}
      {[...months].map(([month, entries]) => (
        <section key={month} className="mt-9" aria-label={month}>
          <h2 className="section-title pb-2">{month}</h2>
          <ul className="rows">
            {entries.map((entry) => (
              <li key={entry.day}>
                <time className="when" dateTime={entry.day}>
                  {mediumDay(entry.day)}
                </time>
                <span>
                  <Link href={`/d/${entry.day}`}>{entry.headline ?? `${entry.story_count} ${entry.story_count === 1 ? 'story' : 'stories'}`}</Link>
                  {entry.headline && (
                    <span className="quiet block">
                      {entry.story_count} {entry.story_count === 1 ? 'story' : 'stories'}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  )
}
