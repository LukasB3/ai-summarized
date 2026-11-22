import type { Metadata } from 'next'
import { StoryItem } from '@/components/StoryItem'
import { MAX_QUERY_LENGTH, search } from '@/lib/data'
import { mediumDay } from '@/lib/format'
import type { Story } from '@/lib/types'

export const metadata: Metadata = { title: 'Search', description: 'Search every story the digest has published.', alternates: { canonical: '/search' }, robots: { index: false } }

type Props = { searchParams: Promise<{ q?: string | string[] }> }

export default async function Search({ searchParams }: Props) {
  const { q } = await searchParams
  const query = (Array.isArray(q) ? q[0] : q)?.trim().slice(0, MAX_QUERY_LENGTH) ?? ''
  let results: Story[] = []
  let failed = false
  if (query) {
    try {
      results = await search(query)
    } catch {
      failed = true
    }
  }

  return (
    <main className="page py-10">
      <h1 className="page-title">Search</h1>
      <form action="/search" method="get" role="search" className="field mt-6 max-w-xl">
        <label htmlFor="q" className="sr-only">
          Search all stories
        </label>
        <input id="q" name="q" type="search" defaultValue={query} maxLength={MAX_QUERY_LENGTH} placeholder="A model, a company, a topic" autoComplete="off" required />
        <button type="submit">Search</button>
      </form>
      <p className="quiet mt-2">Searches titles, summaries and tags of every story. Put a phrase in quotes; a minus before a word excludes it.</p>

      {failed && <p className="notice mt-8">The search could not be run just now. Try again in a moment.</p>}
      {query && !failed && (
        <section className="mt-8" aria-live="polite">
          <h2 className="section-title pb-3">
            {results.length === 0 ? `Nothing found for “${query}”` : `${results.length} ${results.length === 1 ? 'story' : 'stories'} for “${query}”`}
          </h2>
          {results.length === 0 ? (
            <p className="prose-text">Try fewer or different words. Only stories that made it into a digest can be found.</p>
          ) : (
            <ol>
              {results.map((story, index) => (
                // One size for all results; the headline keeps the weight of its impact. The number is the place in this list.
                <StoryItem key={story.id} ranked={{ story, rank: index + 1, tier: 'mid' }} showDay={mediumDay(story.day)} />
              ))}
            </ol>
          )}
        </section>
      )}
    </main>
  )
}
