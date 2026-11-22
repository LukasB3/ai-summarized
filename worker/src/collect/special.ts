import { parseHTML } from 'linkedom'
import type { RawItem } from '../feeds.js'
import { clip, plainText } from '../text.js'
import { canonicalUrl } from '../url.js'

// The three sources that are not feeds.

// --- Hacker News, through the Algolia search API -------------------------
// Stories above a points threshold that match one of a few search words. The
// words only narrow the list; triage decides what is AI news.

export const HN_QUERIES = ['AI', 'LLM', 'Claude', 'OpenAI', 'Anthropic', 'GPT', 'Gemini', 'agent', 'model']
export const HN_MIN_POINTS = 100

interface HnHit {
  objectID?: string
  title?: string
  url?: string | null
  points?: number | null
  created_at?: string
}

export const hnQueryUrl = (base: string, query: string, sinceSeconds: number): string => {
  const url = new URL(base)
  url.searchParams.set('tags', 'story')
  url.searchParams.set('query', query)
  url.searchParams.set('numericFilters', `points>${HN_MIN_POINTS},created_at_i>${sinceSeconds}`)
  url.searchParams.set('hitsPerPage', '50')
  return url.toString()
}

export function parseHnHits(json: string): RawItem[] {
  const body = JSON.parse(json) as { hits?: HnHit[] }
  const items: RawItem[] = []
  for (const hit of body.hits ?? []) {
    if (!hit.objectID || !hit.title) continue
    const discussion = `https://news.ycombinator.com/item?id=${encodeURIComponent(hit.objectID)}`
    const url = canonicalUrl(hit.url || discussion)
    if (!url) continue
    const published = hit.created_at ? new Date(hit.created_at) : null
    items.push({
      url,
      title: clip(hit.title.trim(), 300),
      excerpt: null,
      publishedAt: published && !Number.isNaN(published.getTime()) ? published : null,
      points: hit.points ?? 0,
      discussionUrl: discussion,
    })
  }
  return items
}

// --- Hugging Face daily papers ---------------------------------------------

interface HfPaper {
  title?: string
  summary?: string
  publishedAt?: string
  paper?: { id?: string; upvotes?: number }
}

export function parseHfPapers(json: string): RawItem[] {
  const body = JSON.parse(json) as HfPaper[]
  if (!Array.isArray(body)) throw new Error('unexpected answer')
  const items: RawItem[] = []
  for (const entry of body) {
    const id = entry.paper?.id
    if (!id || !entry.title || !/^[\w.-]+$/.test(id)) continue
    const published = entry.publishedAt ? new Date(entry.publishedAt) : null
    items.push({
      url: `https://huggingface.co/papers/${id}`,
      title: clip(entry.title.replace(/\s+/g, ' ').trim(), 300),
      excerpt: entry.summary ? plainText(entry.summary, 1000) : null,
      publishedAt: published && !Number.isNaN(published.getTime()) ? published : null,
      points: entry.paper?.upvotes ?? 0,
    })
  }
  return items
}

// --- Anthropic's news page, which has no feed -------------------------------
// The only scraped source. Each entry is a list row with a link, a heading, a
// teaser and a date. When the page changes shape this finds nothing, which
// the caller reports as an error instead of silently returning an empty list.

export function parseAnthropicNews(html: string, pageUrl: string): RawItem[] {
  const { document } = parseHTML(html)
  const items: RawItem[] = []
  for (const row of document.querySelectorAll('li[data-listing-row]')) {
    const url = canonicalUrl(row.querySelector('a[href]')?.getAttribute('href') ?? '', pageUrl)
    const title = (row.querySelector('h3')?.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (!url || !title) continue
    const teaser = (row.querySelector('p')?.textContent ?? '').replace(/\s+/g, ' ').trim()
    const date = new Date(`${row.querySelector('time')?.textContent ?? ''} 12:00 UTC`)
    items.push({
      url,
      title: clip(title, 300),
      excerpt: teaser ? clip(teaser, 1000) : null,
      publishedAt: Number.isNaN(date.getTime()) ? null : date,
    })
  }
  return items
}
