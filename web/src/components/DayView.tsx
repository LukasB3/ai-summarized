import Link from 'next/link'
import type { DayPage } from '@/lib/data'
import { ago, longDay, mediumDay } from '@/lib/format'
import { rank, type Ranked } from '@/lib/rank'
import { CATEGORIES, CATEGORY_NAMES, type Category } from '@/lib/types'
import { StoryItem } from './StoryItem'

// A day: the briefing, then every story in ranked order. `stale` is set on the
// front page when the newest digest is older than it should be.
export function DayView({ page, now, stale }: { page: DayPage; now: Date; stale?: boolean }) {
  const { day, digest, stories, previous, next } = page
  const ranked = rank(stories)
  const upper = ranked.filter((entry) => entry.tier !== 'low')
  const lower = ranked.filter((entry) => entry.tier === 'low')
  const position = new Map(ranked.map((entry) => [entry.story.id, entry]))
  const counts = new Map<Category, number>()
  for (const story of stories) counts.set(story.category, (counts.get(story.category) ?? 0) + 1)
  const present = CATEGORIES.filter((category) => counts.has(category))

  return (
    <main className="page day">
      {stale && (
        <p className="notice mt-6">
          The newest digest is from {longDay(day)}. A new one is written every morning at 05:30 Central European Time; today&rsquo;s is not here yet.
        </p>
      )}

      <section className="pt-8 pb-10" aria-labelledby="briefing">
        <p className="briefing-date">
          <time dateTime={day}>{longDay(day)}</time>
        </p>
        {digest ? (
          <>
            <h1 id="briefing" className="briefing-headline">
              {digest.headline}
            </h1>
            <p className="briefing-overview">{digest.overview}</p>
            {digest.points.length > 0 && (
              <ul className="points">
                {digest.points.map((point) => {
                  const target = point.story_ids.map((id) => position.get(id)).find((entry): entry is Ranked => entry !== undefined)
                  return (
                    <li key={point.title} className="point">
                      <h2 className="point-title">{target ? <a href={`#s-${target.story.id}`}>{point.title}</a> : point.title}</h2>
                      <p className="point-text">{point.text}</p>
                    </li>
                  )
                })}
              </ul>
            )}
            <p className="quiet mt-6">
              {stories.length} {stories.length === 1 ? 'story' : 'stories'}, chosen from {digest.item_count} new entries. Written {ago(digest.updated_at, now)}.
            </p>
          </>
        ) : (
          <>
            <h1 id="briefing" className="briefing-headline">
              {stories.length} {stories.length === 1 ? 'story' : 'stories'}
            </h1>
            <p className="notice mt-5">No briefing was written for this day. The stories are below.</p>
          </>
        )}
      </section>

      <section aria-labelledby="stories">
        <div className="border-t-2 border-ink pt-4 pb-5">
          <h2 id="stories" className="section-title">
            Ranked stories
          </h2>
          <p className="legend quiet mt-1">
            <span>The heavier the headline, the higher the impact:</span>
            <span className="legend-sample" aria-hidden="true">
              <span style={{ fontWeight: 300 }}>minor</span> <span style={{ fontWeight: 500 }}>notable</span>{' '}
              <span style={{ fontWeight: 650 }}>major</span> <span style={{ fontWeight: 800 }}>field-changing</span>
            </span>
          </p>
          {present.length > 1 && (
            <fieldset className="filter mt-4">
              <legend className="sr-only">Show a category</legend>
              <input type="radio" name="category" id="filter-all" defaultChecked />
              <label htmlFor="filter-all">
                All <span className="count">{stories.length}</span>
              </label>
              {present.map((category) => (
                <span key={category} className="contents">
                  <input type="radio" name="category" id={`filter-${category}`} />
                  <label htmlFor={`filter-${category}`}>
                    {CATEGORY_NAMES[category]} <span className="count">{counts.get(category)}</span>
                  </label>
                </span>
              ))}
            </fieldset>
          )}
        </div>

        <ol>
          {upper.map((entry) => (
            <StoryItem key={entry.story.id} ranked={entry} />
          ))}
        </ol>

        {lower.length > 0 && (
          <details className="lower" open={upper.length === 0}>
            <summary>Lower-ranked stories</summary>
            <ol>
              {lower.map((entry) => (
                <StoryItem key={entry.story.id} ranked={entry} />
              ))}
            </ol>
          </details>
        )}
      </section>

      <nav className="step mt-10 border-t border-line pt-5" aria-label="Other days">
        <span>{previous && <Link href={`/d/${previous}`}>Earlier: {mediumDay(previous)}</Link>}</span>
        <span>{next && <Link href={`/d/${next}`}>Later: {mediumDay(next)}</Link>}</span>
      </nav>
    </main>
  )
}
