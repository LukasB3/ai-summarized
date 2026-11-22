import { Readability } from '@mozilla/readability'
import { parseHTML } from 'linkedom'
import { fetchOk, type FetchOptions } from './http.js'
import type { Robots } from './robots.js'
import { clip } from './text.js'

// Reads the main text of an article so the summary rests on more than a feed
// teaser. The text is working material only: it is stored for 30 days, never
// shown, and not readable through the public API.

// Enough for the substance of a news article; what follows is rarely needed
// to summarise it in three sentences.
export const ARTICLE_MAX_CHARS = 8000

export function extractArticle(html: string): string | null {
  try {
    const { document } = parseHTML(html)
    // linkedom's document is not typed as the browser's; Readability only needs the DOM methods both have.
    const article = new Readability(document as unknown as ConstructorParameters<typeof Readability>[0], { charThreshold: 300 }).parse()
    const text = (article?.textContent ?? '').replace(/\s+/g, ' ').trim()
    return text.length >= 300 ? clip(text, ARTICLE_MAX_CHARS) : null
  } catch {
    return null
  }
}

export async function fetchArticle(url: string, robots: Robots, options: FetchOptions): Promise<string | null> {
  try {
    if (!(await robots.allows(url))) return null
    const page = await fetchOk(url, { ...options, accept: 'text/html', maxBytes: 3_000_000 })
    if (!/html/i.test(page.contentType)) return null
    return extractArticle(page.text)
  } catch {
    return null
  }
}
