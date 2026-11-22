import { parseFeed, type RawItem } from '../feeds.js'
import { fetchOk } from '../http.js'
import { pool } from '../pool.js'
import type { Source } from '../sources.js'
import { HN_QUERIES, hnQueryUrl, parseAnthropicNews, parseHfPapers, parseHnHits } from './special.js'

// Fetches every source. A source that fails is reported with its error and
// never stops the others.

export interface Collected {
  source: Source
  items: RawItem[]
  error: string | null
}

export interface CollectOptions {
  userAgent: string
  maxAgeHours: number
  now?: Date
}

const FEED_ACCEPT = 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5'
// Some feeds carry every article in full; the largest seen was 4.7 MB.
const FEED_MAX_BYTES = 8_000_000

async function collectOne(source: Source, options: CollectOptions): Promise<RawItem[]> {
  const { userAgent } = options
  switch (source.kind) {
    case 'feed': {
      const { text } = await fetchOk(source.url, { userAgent, accept: FEED_ACCEPT, maxBytes: FEED_MAX_BYTES })
      return parseFeed(text, source.url)
    }
    case 'hf_papers': {
      const { text } = await fetchOk(source.url, { userAgent, accept: 'application/json' })
      return parseHfPapers(text)
    }
    case 'anthropic_news': {
      const { text } = await fetchOk(source.url, { userAgent, accept: 'text/html' })
      const items = parseAnthropicNews(text, source.url)
      if (items.length === 0) throw new Error('no entries found on the page')
      return items
    }
    case 'hn': {
      const now = options.now ?? new Date()
      const since = Math.floor(now.getTime() / 1000 - options.maxAgeHours * 3600)
      const byUrl = new Map<string, RawItem>()
      // One query after the other: the API is free and deserves gentle use.
      for (const query of HN_QUERIES) {
        const { text } = await fetchOk(hnQueryUrl(source.url, query, since), { userAgent, accept: 'application/json' })
        for (const item of parseHnHits(text)) byUrl.set(item.url, item)
      }
      return [...byUrl.values()]
    }
  }
}

// Entries with a date must be recent. Entries without one cannot be judged,
// so they only count once the source has been read before: the first read of
// a source would otherwise bring in its whole back catalogue as news.
export function isFresh(item: RawItem, now: Date, maxAgeHours: number, sourceSeenBefore: boolean): boolean {
  if (!item.publishedAt) return sourceSeenBefore
  const ageHours = (now.getTime() - item.publishedAt.getTime()) / 3_600_000
  return ageHours <= maxAgeHours && ageHours > -24
}

export async function collectAll(sources: Source[], options: CollectOptions): Promise<Collected[]> {
  return pool(sources, 8, async (source): Promise<Collected> => {
    try {
      const seen = new Set<string>()
      const items = (await collectOne(source, options)).filter((item) => !seen.has(item.url) && seen.add(item.url))
      return { source, items, error: null }
    } catch (error) {
      return { source, items: [], error: error instanceof Error ? error.message.slice(0, 200) : 'unknown error' }
    }
  })
}
