import { XMLParser } from 'fast-xml-parser'
import { plainText } from './text.js'
import { canonicalUrl } from './url.js'

// One reader for RSS 2.0, Atom and RSS 1.0 (RDF). Feeds differ in where they
// put the link, the date and the text; everything is reduced to RawItem.

export interface RawItem {
  url: string
  title: string
  excerpt: string | null
  publishedAt: Date | null
  points?: number
  discussionUrl?: string
}

type Node = Record<string, unknown>

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  textNodeName: '#text',
  trimValues: true,
  parseTagValue: false,
  isArray: (name) => name === 'item' || name === 'entry' || name === 'link',
})

const asText = (value: unknown): string => {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) return asText(value[0])
  if (value && typeof value === 'object') return asText((value as Node)['#text'])
  return ''
}

const asDate = (value: unknown): Date | null => {
  const text = asText(value)
  if (!text) return null
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

function atomLink(entry: Node): string {
  const links = (entry.link as unknown[] | undefined) ?? []
  const nodes = links.filter((link): link is Node => typeof link === 'object' && link !== null)
  const pick = nodes.find((link) => link['@rel'] === 'alternate') ?? nodes.find((link) => !link['@rel']) ?? nodes[0]
  return pick ? asText(pick['@href']) : asText(links[0])
}

function rssLink(item: Node): string {
  const links = (item.link as unknown[] | undefined) ?? []
  const first = asText(links[0])
  if (first) return first
  // Some feeds only carry the address in a permalink guid.
  const guid = item.guid
  const isPermalink = typeof guid === 'string' || (guid as Node | undefined)?.['@isPermaLink'] !== 'false'
  return isPermalink ? asText(guid) : ''
}

export function parseFeed(xml: string, feedUrl: string): RawItem[] {
  const doc = parser.parse(xml) as Node
  const rss = doc.rss as Node | undefined
  const rdf = doc['rdf:RDF'] as Node | undefined
  const atom = doc.feed as Node | undefined

  let entries: Node[]
  let isAtom = false
  if (atom) {
    entries = (atom.entry as Node[] | undefined) ?? []
    isAtom = true
  } else if (rss) {
    entries = ((rss.channel as Node | undefined)?.item as Node[] | undefined) ?? []
  } else if (rdf) {
    entries = (rdf.item as Node[] | undefined) ?? []
  } else {
    throw new Error('not a feed')
  }

  const items: RawItem[] = []
  for (const entry of entries) {
    const url = canonicalUrl(isAtom ? atomLink(entry) : rssLink(entry), feedUrl)
    const title = plainText(asText(entry.title), 300)
    if (!url || !title) continue
    const body = asText(entry['content:encoded']) || asText(entry.description) || asText(entry.summary) || asText(entry.content)
    const comments = isAtom ? null : canonicalUrl(asText(entry.comments), feedUrl)
    items.push({
      url,
      title,
      excerpt: plainText(body, 1000) || null,
      publishedAt: asDate(entry.pubDate) ?? asDate(entry.published) ?? asDate(entry.updated) ?? asDate(entry['dc:date']),
      ...(comments ? { discussionUrl: comments } : {}),
    })
  }
  return items
}
