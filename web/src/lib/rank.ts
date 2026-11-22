import type { Story } from './types'

// How a day is laid out. The order and the tiers come from the two scores the
// worker stores; the type size follows the tier and the weight follows impact.

export type Tier = 'major' | 'high' | 'mid' | 'low'

export const MAJOR_IMPACT = 85

export const tierOf = (story: Pick<Story, 'impact' | 'score'>): Tier =>
  story.impact >= MAJOR_IMPACT ? 'major' : story.score >= 65 ? 'high' : story.score >= 45 ? 'mid' : 'low'

export interface Ranked {
  story: Story
  rank: number
  tier: Tier
}

// Major stories first, whatever their fit; then everything by score. Ties keep
// the older story first so the order is stable between page loads.
export function rank(stories: Story[]): Ranked[] {
  const order = (a: Story, b: Story): number => b.score - a.score || b.impact - a.impact || a.id - b.id
  const major = stories.filter((story) => story.impact >= MAJOR_IMPACT).sort(order)
  const others = stories.filter((story) => story.impact < MAJOR_IMPACT).sort(order)
  return [...major, ...others].map((story, index) => ({ story, rank: index + 1, tier: tierOf(story) }))
}

// The weight of a headline on the font's 200 to 800 axis: 300 at no impact, 800 at full.
export const headlineWeight = (impact: number): number => Math.round(300 + Math.min(100, Math.max(0, impact)) * 5)
