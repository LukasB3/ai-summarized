export const CATEGORIES = ['models', 'tools', 'research', 'safety', 'business', 'policy', 'other'] as const
export type Category = (typeof CATEGORIES)[number]

// A stored feed entry, as the stages need it.
export interface Item {
  id: number
  source_id: string
  url: string
  title: string
  excerpt: string | null
  published_at: string | null
  points: number | null
  discussion_url: string | null
  triage_score: number | null
  story_id: number | null
}

// One outlet's report in a story's list of sources, shown on the website.
export interface StoryLink {
  source: string
  name: string
  title: string
  url: string
  discussion?: string
  points?: number
}

export interface Story {
  id: number
  day: string
  title: string
  summary: string
  why_it_matters: string
  category: Category
  tags: string[]
  impact: number
  fit: number
  coverage: number
  score: number
  score_reason: string
  links: StoryLink[]
  source_count: number
}
