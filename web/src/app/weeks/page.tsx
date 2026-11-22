import type { Metadata } from 'next'
import Link from 'next/link'
import { weeks } from '@/lib/data'
import { weekName, weekRange } from '@/lib/format'

export const revalidate = 300

export const metadata: Metadata = { title: 'Weekly reviews', description: 'What each week in AI added up to.', alternates: { canonical: '/weeks' } }

export default async function Weeks() {
  const all = await weeks()
  return (
    <main className="page py-10">
      <h1 className="page-title">Weekly reviews</h1>
      <p className="prose-text mt-4 max-w-xl">Every Sunday evening, one text about what the week added up to, written from that week&rsquo;s highest-ranked stories.</p>
      {all.length === 0 ? (
        <p className="prose-text mt-6">The first review is written on Sunday at 18:00 Central European Time.</p>
      ) : (
        <ul className="rows mt-8">
          {all.map((entry) => (
            <li key={entry.week}>
              <span className="when">{weekName(entry.week)}</span>
              <span>
                <Link href={`/week/${entry.week}`}>{entry.headline}</Link>
                <span className="quiet block">{weekRange(entry.week_start, entry.week_end)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
