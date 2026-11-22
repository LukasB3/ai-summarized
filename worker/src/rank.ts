import type { SourceCategory } from './sources.js'

// The final score of a story. Impact and fit come from the model; coverage is
// counted here from who reported it.

export interface Outlet {
  sourceId: string
  category: SourceCategory
  weight: number
  points: number
}

export const MAJOR_IMPACT = 85

const clampInt = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, Math.round(value)))

export const clampScore = (value: number): number => (Number.isFinite(value) ? clampInt(value, 0, 100) : 0)

// 0 to 10 points for a story that several independent outlets report, or that
// practitioners pass around. One outlet gives nothing; each doubling of the
// weighted outlet count adds 3. Hacker News points add up to 3, upvotes on a
// daily paper up to 2.
export function coverageBonus(outlets: Outlet[]): number {
  const bySource = new Map<string, Outlet>()
  for (const outlet of outlets) {
    const known = bySource.get(outlet.sourceId)
    if (!known || outlet.points > known.points) bySource.set(outlet.sourceId, outlet)
  }
  let weight = 0
  let community = 0
  for (const outlet of bySource.values()) {
    weight += outlet.weight
    if (outlet.sourceId === 'hn') community += outlet.points >= 600 ? 3 : outlet.points >= 300 ? 2 : outlet.points >= 100 ? 1 : 0
    if (outlet.sourceId === 'hf-papers') community += outlet.points >= 150 ? 2 : outlet.points >= 50 ? 1 : 0
  }
  const breadth = weight > 1 ? 3 * Math.log2(weight) : 0
  return clampInt(breadth + community, 0, 10)
}

export function finalScore(impact: number, fit: number, coverage: number, weights: { impact: number; fit: number }): number {
  return clampScore(weights.impact * impact + weights.fit * fit + coverage)
}
