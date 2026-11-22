export const CATEGORIES = ['models', 'tools', 'research', 'safety', 'business', 'policy', 'other'] as const
export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_NAMES: Record<Category, string> = {
  models: 'Models',
  tools: 'Tools',
  research: 'Research',
  safety: 'Safety',
  business: 'Business',
  policy: 'Policy',
  other: 'Other',
}

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
  major: boolean
  links: StoryLink[]
  source_count: number
}

export interface Point {
  title: string
  text: string
  story_ids: number[]
}

export interface Digest {
  day: string
  headline: string
  overview: string
  points: Point[]
  story_count: number
  item_count: number
  updated_at: string
}

// One line of the archive: a day that has stories, with its briefing's headline if one was written.
export interface DayEntry {
  day: string
  story_count: number
  headline: string | null
}

export interface Review {
  week: string
  week_start: string
  week_end: string
  headline: string
  overview: string
  themes: Point[]
  watch: string
  story_count: number
}

export interface WeekEntry {
  week: string
  week_start: string
  week_end: string
  headline: string
}

export interface SourceStatus {
  id: string
  name: string
  site_url: string
  category: 'lab' | 'press' | 'community' | 'people' | 'research' | 'releases'
  enabled: boolean
  last_ok_at: string | null
  failures: number
}
