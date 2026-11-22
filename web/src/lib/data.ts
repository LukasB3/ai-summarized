import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SAMPLE_DIGESTS, SAMPLE_REVIEW, SAMPLE_SOURCES, SAMPLE_STORIES } from './sample'
import type { DayEntry, Digest, Review, SourceStatus, Story, WeekEntry } from './types'

// Everything the pages read. The site only ever reads, with the publishable
// key, what the database's row-level security opens to everyone. Pages are
// rebuilt at most every few minutes, so these queries run rarely.

const STORY_COLUMNS = 'id, day, title, summary, why_it_matters, category, tags, impact, fit, coverage, score, score_reason, major, links, source_count'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_PUBLISHABLE_KEY

// Without a database the development server shows sample data. A production
// build without one is a mistake and must not go live looking fine.
const useSample = !url || !key
if (useSample && process.env.NODE_ENV === 'production' && process.env.ALLOW_SAMPLE_DATA !== '1') {
  throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are not set')
}

let client: SupabaseClient | null = null
const db = (): SupabaseClient => (client ??= createClient(url as string, key as string, { auth: { persistSession: false, autoRefreshToken: false } }))

function must<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new Error(`could not read ${what}: ${result.error.message}`)
  return result.data as T
}

const byScore = (a: Story, b: Story): number => b.score - a.score || a.id - b.id

// --- days --------------------------------------------------------------------

export async function days(): Promise<DayEntry[]> {
  if (useSample) {
    return SAMPLE_DIGESTS.map((digest) => ({ day: digest.day, story_count: SAMPLE_STORIES.filter((story) => story.day === digest.day).length, headline: digest.headline }))
  }
  return must(await db().from('days').select('day, story_count, headline').order('day', { ascending: false }).limit(1000), 'the list of days') as DayEntry[]
}

export interface DayPage {
  day: string
  digest: Digest | null
  stories: Story[]
  previous: string | null
  next: string | null
}

export async function dayPage(day: string): Promise<DayPage | null> {
  if (useSample) {
    const stories = SAMPLE_STORIES.filter((story) => story.day === day).sort(byScore)
    if (stories.length === 0) return null
    const all = SAMPLE_DIGESTS.map((digest) => digest.day).sort()
    const index = all.indexOf(day)
    return { day, digest: SAMPLE_DIGESTS.find((digest) => digest.day === day) ?? null, stories, previous: all[index - 1] ?? null, next: all[index + 1] ?? null }
  }
  const [stories, digest, previous, next] = await Promise.all([
    db().from('stories').select(STORY_COLUMNS).eq('day', day).order('score', { ascending: false }).order('id', { ascending: true }).limit(300),
    db().from('digests').select('day, headline, overview, points, story_count, item_count, updated_at').eq('day', day).maybeSingle(),
    db().from('days').select('day').lt('day', day).order('day', { ascending: false }).limit(1),
    db().from('days').select('day').gt('day', day).order('day', { ascending: true }).limit(1),
  ])
  const list = must(stories, 'the stories') as Story[]
  if (list.length === 0) return null
  return {
    day,
    digest: must(digest, 'the briefing') as Digest | null,
    stories: list,
    previous: (must(previous, 'the previous day') as { day: string }[])[0]?.day ?? null,
    next: (must(next, 'the next day') as { day: string }[])[0]?.day ?? null,
  }
}

export async function latestDay(): Promise<string | null> {
  if (useSample) return SAMPLE_DIGESTS[0]?.day ?? null
  return (must(await db().from('days').select('day').order('day', { ascending: false }).limit(1), 'the latest day') as { day: string }[])[0]?.day ?? null
}

// --- weeks -------------------------------------------------------------------

export async function weeks(): Promise<WeekEntry[]> {
  if (useSample) return [SAMPLE_REVIEW]
  return must(await db().from('reviews').select('week, week_start, week_end, headline').order('week', { ascending: false }).limit(300), 'the list of weeks') as WeekEntry[]
}

export interface WeekPage {
  review: Review
  // The stories the review refers to, by id.
  stories: Map<number, Story>
}

export async function weekPage(week: string): Promise<WeekPage | null> {
  if (useSample) {
    if (week !== SAMPLE_REVIEW.week) return null
    return { review: SAMPLE_REVIEW, stories: new Map(SAMPLE_STORIES.map((story) => [story.id, story])) }
  }
  const review = must(await db().from('reviews').select('week, week_start, week_end, headline, overview, themes, watch, story_count').eq('week', week).maybeSingle(), 'the review') as Review | null
  if (!review) return null
  const ids = [...new Set(review.themes.flatMap((theme) => theme.story_ids))]
  const stories = ids.length > 0 ? (must(await db().from('stories').select(STORY_COLUMNS).in('id', ids), 'the stories of the review') as Story[]) : []
  return { review, stories: new Map(stories.map((story) => [story.id, story])) }
}

// --- search ------------------------------------------------------------------

export const MAX_QUERY_LENGTH = 200

export async function search(query: string): Promise<Story[]> {
  const q = query.trim().slice(0, MAX_QUERY_LENGTH)
  if (!q) return []
  if (useSample) {
    const words = q.toLowerCase().split(/\s+/)
    return SAMPLE_STORIES.filter((story) => words.every((word) => `${story.title} ${story.summary} ${story.tags.join(' ')}`.toLowerCase().includes(word)))
  }
  return must(await db().rpc('search_stories', { q, max_results: 40 }), 'the search results') as Story[]
}

// --- sources -----------------------------------------------------------------

export async function sources(): Promise<SourceStatus[]> {
  if (useSample) return SAMPLE_SOURCES
  return must(await db().from('sources').select('id, name, site_url, category, enabled, last_ok_at, failures').eq('enabled', true).order('name', { ascending: true }).limit(200), 'the sources') as SourceStatus[]
}
