import { coverageBonus, type Outlet } from './rank.js'
import type { Source } from './sources.js'
import type { Item, StoryLink } from './types.js'

// What a story shows about where it comes from, derived from its entries.

const ORDER: Record<Source['category'], number> = { lab: 0, press: 1, research: 2, people: 3, releases: 4, community: 5 }

export interface Provenance {
  links: StoryLink[]
  sourceCount: number
  coverage: number
}

export function provenance(items: Item[], sourceOf: (item: Item) => Source): Provenance {
  const sorted = [...items].sort((a, b) => ORDER[sourceOf(a).category] - ORDER[sourceOf(b).category] || (b.triage_score ?? 0) - (a.triage_score ?? 0) || a.id - b.id)
  const links: StoryLink[] = []
  const seen = new Set<string>()
  const outlets: Outlet[] = []
  for (const item of sorted) {
    const source = sourceOf(item)
    outlets.push({ sourceId: source.id, category: source.category, weight: source.weight, points: item.points ?? 0 })
    const key = `${source.id} ${item.url}`
    if (seen.has(key)) continue
    seen.add(key)
    links.push({
      source: source.id,
      name: source.name,
      title: item.title,
      url: item.url,
      ...(item.discussion_url ? { discussion: item.discussion_url } : {}),
      ...(item.points ? { points: item.points } : {}),
    })
  }
  return { links, sourceCount: new Set(outlets.map((outlet) => outlet.sourceId)).size, coverage: coverageBonus(outlets) }
}
