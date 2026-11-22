import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { weekPage } from '@/lib/data'
import { isWeek, mediumDay, weekName, weekRange } from '@/lib/format'
import type { Story } from '@/lib/types'

export const revalidate = 300

export const generateStaticParams = async () => []

type Props = { params: Promise<{ week: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { week } = await params
  const page = isWeek(week) ? await weekPage(week) : null
  if (!page) return {}
  return { title: `${page.review.headline} (${weekName(week)})`, description: page.review.overview, alternates: { canonical: `/week/${week}` } }
}

export default async function WeekReview({ params }: Props) {
  const { week } = await params
  if (!isWeek(week)) notFound()
  const page = await weekPage(week)
  if (!page) notFound()
  const { review, stories } = page

  return (
    <main className="page py-10">
      <p className="briefing-date">
        {weekName(review.week)}, {weekRange(review.week_start, review.week_end)}
      </p>
      <h1 className="briefing-headline">{review.headline}</h1>
      <p className="briefing-overview">{review.overview}</p>

      <div className="mt-10">
        {review.themes.map((theme) => {
          const referenced = theme.story_ids.map((id) => stories.get(id)).filter((story): story is Story => story !== undefined)
          return (
            <section key={theme.title} className="border-t-2 border-ink pt-4 pb-8">
              <h2 className="section-title">{theme.title}</h2>
              <p className="prose-text mt-2 max-w-[40rem]">{theme.text}</p>
              {referenced.length > 0 && (
                <ul className="mt-3 grid gap-1.5">
                  {referenced.map((story) => (
                    <li key={story.id} className="quiet">
                      <Link href={`/d/${story.day}#s-${story.id}`} className="font-semibold text-ink">
                        {story.title}
                      </Link>{' '}
                      <span className="whitespace-nowrap">{mediumDay(story.day)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>

      {review.watch && (
        <section className="border-t-2 border-ink pt-4">
          <h2 className="section-title">Next week</h2>
          <p className="prose-text mt-2 max-w-[40rem]">{review.watch}</p>
        </section>
      )}

      <p className="quiet mt-10">
        Written from the {review.story_count} highest-ranked stories of the week. <Link href="/weeks">All weekly reviews</Link>
      </p>
    </main>
  )
}
