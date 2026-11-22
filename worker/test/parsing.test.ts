import { describe, expect, it } from 'vitest'
import { extractArticle } from '../src/article.js'
import { hnQueryUrl, parseAnthropicNews, parseHfPapers, parseHnHits } from '../src/collect/special.js'
import { parseFeed } from '../src/feeds.js'

describe('parseFeed', () => {
  it('reads RSS 2.0', () => {
    const xml = `<?xml version="1.0"?><rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/"><channel><title>Feed</title><link>https://example.com</link>
      <item><title>First &amp; foremost</title><link>https://example.com/a?utm_source=rss</link><pubDate>Sat, 21 Nov 2026 20:03:46 -0600</pubDate>
        <description><![CDATA[<p>Teaser <b>text</b></p>]]></description><content:encoded><![CDATA[<p>Full text of the post.</p>]]></content:encoded></item>
      <item><title>No link</title></item>
      <item><title>Guid only</title><guid>https://example.com/b</guid></item>
    </channel></rss>`
    const items = parseFeed(xml, 'https://example.com/feed')
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ url: 'https://example.com/a', title: 'First & foremost', excerpt: 'Full text of the post.' })
    expect(items[0]?.publishedAt?.toISOString()).toBe('2026-11-22T02:03:46.000Z')
    expect(items[1]?.url).toBe('https://example.com/b')
  })

  it('reads Atom and prefers the alternate link', () => {
    const xml = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><title>Releases</title>
      <entry><title type="html">v1.2.3</title><link rel="self" href="https://example.com/self"/><link rel="alternate" type="text/html" href="https://example.com/releases/v1.2.3"/>
        <updated>2026-11-21T10:00:00Z</updated><content type="html">&lt;p&gt;Fixes&lt;/p&gt;</content></entry>
      <entry><title>Second</title><link href="/relative"/><published>2026-11-20T10:00:00Z</published><summary>Sum</summary></entry>
    </feed>`
    const items = parseFeed(xml, 'https://example.com/feed.atom')
    expect(items.map((item) => item.url)).toEqual(['https://example.com/releases/v1.2.3', 'https://example.com/relative'])
    expect(items[0]).toMatchObject({ title: 'v1.2.3', excerpt: 'Fixes' })
    expect(items[1]?.publishedAt?.toISOString()).toBe('2026-11-20T10:00:00.000Z')
  })

  it('reads RSS 1.0 and keeps a discussion link', () => {
    const rdf = `<?xml version="1.0"?><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns="http://purl.org/rss/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <item><title>Paper</title><link>https://example.org/abs/1</link><dc:date>2026-11-21T00:00:00Z</dc:date><description>Abstract</description></item></rdf:RDF>`
    expect(parseFeed(rdf, 'https://example.org/rss')[0]).toMatchObject({ url: 'https://example.org/abs/1', title: 'Paper', excerpt: 'Abstract' })

    const lobsters = `<rss version="2.0"><channel><item><title>Story</title><link>https://arstechnica.com/x/</link><comments>https://lobste.rs/s/abc/story</comments></item></channel></rss>`
    expect(parseFeed(lobsters, 'https://lobste.rs/t/ai.rss')[0]).toMatchObject({ url: 'https://arstechnica.com/x', discussionUrl: 'https://lobste.rs/s/abc/story' })
  })

  it('skips entries whose link is not a web address', () => {
    const xml = `<rss><channel><item><title>Bad</title><link>javascript:alert(1)</link></item></channel></rss>`
    expect(parseFeed(xml, 'https://example.com/feed')).toEqual([])
  })

  it('rejects what is not a feed', () => {
    expect(() => parseFeed('<html><body>Sign in</body></html>', 'https://example.com/feed')).toThrow('not a feed')
  })
})

describe('Hacker News', () => {
  it('builds the search address', () => {
    const url = new URL(hnQueryUrl('https://hn.algolia.com/api/v1/search_by_date', 'LLM', 1_795_000_000))
    expect(url.searchParams.get('query')).toBe('LLM')
    expect(url.searchParams.get('numericFilters')).toBe('points>100,created_at_i>1795000000')
  })
  it('reads hits and falls back to the discussion when a post has no link', () => {
    const json = JSON.stringify({
      hits: [
        { objectID: '1', title: 'A model', url: 'https://example.com/model?utm_source=hn', points: 420, created_at: '2026-11-21T10:00:00Z' },
        { objectID: '2', title: 'Ask HN: something', url: null, points: 150, created_at: '2026-11-21T11:00:00Z' },
        { objectID: '3' },
      ],
    })
    const items = parseHnHits(json)
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ url: 'https://example.com/model', points: 420, discussionUrl: 'https://news.ycombinator.com/item?id=1' })
    expect(items[1]?.url).toBe('https://news.ycombinator.com/item?id=2')
  })
})

describe('Hugging Face daily papers', () => {
  it('reads papers and ignores odd ids', () => {
    const json = JSON.stringify([
      { title: 'A  paper\n title', summary: 'We show <b>things</b>.', publishedAt: '2026-11-18T19:00:00.000Z', paper: { id: '2611.26232', upvotes: 61 } },
      { title: 'Odd', paper: { id: '../../etc' } },
    ])
    expect(parseHfPapers(json)).toEqual([
      { url: 'https://huggingface.co/papers/2611.26232', title: 'A paper title', excerpt: 'We show things .', publishedAt: new Date('2026-11-18T19:00:00.000Z'), points: 61 },
    ])
  })
  it('rejects an unexpected answer', () => {
    expect(() => parseHfPapers('{"error":"x"}')).toThrow()
  })
})

describe("Anthropic's news page", () => {
  const html = `<html><body><ul>
    <li data-listing-row="a"><div><a href="/news/first-post"><span><h3>First post </h3></span></a><a tabindex="-1" href="/news/first-post"><p>Teaser of the first post.</p></a></div><header><time>Nov 20, 2026</time></header></li>
    <li data-listing-row="b"><div><a href="/claude-something"><h3>Second post</h3></a></div><time>Nov 9, 2026</time></li>
    <li data-listing-row="c"><div><a href="/news/no-title"></a></div></li>
  </ul></body></html>`
  it('reads rows with link, heading, teaser and date', () => {
    const items = parseAnthropicNews(html, 'https://www.anthropic.com/news')
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ url: 'https://www.anthropic.com/news/first-post', title: 'First post', excerpt: 'Teaser of the first post.' })
    expect(items[0]?.publishedAt?.toISOString()).toBe('2026-11-20T12:00:00.000Z')
    expect(items[1]).toMatchObject({ url: 'https://www.anthropic.com/claude-something', excerpt: null })
  })
  it('finds nothing when the page has another shape', () => {
    expect(parseAnthropicNews('<html><body><a href="/news/x">X</a></body></html>', 'https://www.anthropic.com/news')).toEqual([])
  })
})

describe('extractArticle', () => {
  it('returns the main text of a page', () => {
    const paragraph = 'The lab released a new model today and described how it was trained and evaluated in detail. '
    const html = `<html><head><title>Post</title></head><body><nav>Home About</nav><article><h1>Post</h1>${`<p>${paragraph}</p>`.repeat(8)}</article><footer>Imprint</footer></body></html>`
    const text = extractArticle(html)
    expect(text).toContain('The lab released a new model today')
    expect(text).not.toContain('Imprint')
  })
  it('returns nothing for a page without an article', () => {
    expect(extractArticle('<html><body><p>Please enable JavaScript.</p></body></html>')).toBeNull()
  })
})
