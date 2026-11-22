import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Collected } from './collect/index.js'
import type { RawItem } from './feeds.js'
import type { Briefing, Review } from './stages/briefing.js'
import type { RecentStory } from './stages/cluster.js'
import type { Triage } from './stages/triage.js'
import type { Source } from './sources.js'
import type { Category, Item, Story, StoryLink } from './types.js'
import type { Week } from './day.js'

// Everything the worker reads and writes, through Supabase's Data API with a
// secret key. Each method is one question or one change.

interface Failure {
  message: string
}

function must<T>(result: { data: T | null; error: Failure | null }, what: string): T {
  if (result.error) throw new Error(`database, ${what}: ${result.error.message}`)
  return result.data as T
}

const ITEM_COLUMNS = 'id, source_id, url, title, excerpt, published_at, points, discussion_url, triage_score, story_id'
const STORY_COLUMNS = 'id, day, title, summary, why_it_matters, category, tags, impact, fit, coverage, score, score_reason, links, source_count'

const hoursAgo = (hours: number): string => new Date(Date.now() - hours * 3_600_000).toISOString()

interface SourceRow {
  id: string
  last_ok_at: string | null
  last_error_at: string | null
  failures: number
}

export interface NewStory {
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
  primary_url: string
  model: string
}

export interface RunOutcome {
  status: 'ok' | 'capped' | 'failed'
  stats: unknown
  input_tokens: number
  output_tokens: number
  cost_usd: number
  error: string | null
}

export class Db {
  constructor(private readonly client: SupabaseClient) {}

  // --- sources ---------------------------------------------------------------

  async sourceRows(): Promise<Map<string, SourceRow>> {
    const rows = must(await this.client.from('sources').select('id, last_ok_at, last_error_at, failures'), 'read sources') as SourceRow[]
    return new Map(rows.map((row) => [row.id, row]))
  }

  // Writes the list from the code together with what this run learned about
  // each source's health, and switches off sources that left the list.
  async saveSources(collected: Collected[], known: Map<string, SourceRow>): Promise<void> {
    const now = new Date().toISOString()
    const rows = collected.map(({ source, error }) => {
      const before = known.get(source.id)
      return {
        id: source.id,
        name: source.name,
        kind: source.kind,
        url: source.url,
        site_url: source.siteUrl,
        category: source.category,
        weight: source.weight,
        enabled: true,
        last_ok_at: error ? (before?.last_ok_at ?? null) : now,
        last_error: error,
        last_error_at: error ? now : (before?.last_error_at ?? null),
        failures: error ? (before?.failures ?? 0) + 1 : 0,
      }
    })
    must(await this.client.from('sources').upsert(rows, { onConflict: 'id' }).select('id'), 'save sources')
    const current = new Set(collected.map(({ source }) => source.id))
    const gone = [...known.keys()].filter((id) => !current.has(id))
    if (gone.length > 0) must(await this.client.from('sources').update({ enabled: false }).in('id', gone).select('id'), 'disable sources')
  }

  // --- items -----------------------------------------------------------------

  // Stores entries not seen before from this source and returns how many were new.
  async insertItems(source: Source, items: RawItem[]): Promise<number> {
    let added = 0
    for (let start = 0; start < items.length; start += 200) {
      const rows = items.slice(start, start + 200).map((item) => ({
        source_id: source.id,
        url: item.url,
        title: item.title,
        excerpt: item.excerpt,
        published_at: item.publishedAt?.toISOString() ?? null,
        points: item.points ?? null,
        discussion_url: item.discussionUrl ?? null,
      }))
      const inserted = must(await this.client.from('items').upsert(rows, { onConflict: 'source_id,url', ignoreDuplicates: true }).select('id'), 'store items') as unknown[]
      added += inserted.length
    }
    return added
  }

  async untriaged(limit: number): Promise<Item[]> {
    return must(
      await this.client.from('items').select(ITEM_COLUMNS).is('triaged_at', null).gte('fetched_at', hoursAgo(72)).order('published_at', { ascending: false, nullsFirst: false }).limit(limit),
      'read untriaged items',
    ) as Item[]
  }

  async saveTriage(id: number, triage: Triage): Promise<void> {
    must(
      await this.client
        .from('items')
        .update({ is_ai_news: triage.isAiNews, triage_category: triage.category, triage_score: triage.score, triage_reason: triage.reason, triaged_at: new Date().toISOString() })
        .eq('id', id)
        .select('id'),
      'save triage',
    )
  }

  // AI news above the threshold that belongs to no story yet.
  async candidates(threshold: number): Promise<Item[]> {
    return must(
      await this.client.from('items').select(ITEM_COLUMNS).is('story_id', null).eq('is_ai_news', true).gte('triage_score', threshold).gte('fetched_at', hoursAgo(36)).order('triage_score', { ascending: false }).limit(1000),
      'read candidates',
    ) as Item[]
  }

  async itemsOfStory(storyId: number): Promise<Item[]> {
    return must(await this.client.from('items').select(ITEM_COLUMNS).eq('story_id', storyId).limit(500), 'read items of story') as Item[]
  }

  async assignToStory(itemIds: number[], storyId: number): Promise<void> {
    must(await this.client.from('items').update({ story_id: storyId }).in('id', itemIds).select('id'), 'assign items')
  }

  // The careful reading found these are not news after all.
  async markNotNews(itemIds: number[]): Promise<void> {
    must(await this.client.from('items').update({ is_ai_news: false }).in('id', itemIds).select('id'), 'mark items')
  }

  async saveArticle(itemId: number, text: string): Promise<void> {
    must(await this.client.from('items').update({ article_text: text, article_fetched_at: new Date().toISOString() }).eq('id', itemId).select('id'), 'save article')
  }

  async countItemsSince(hours: number): Promise<number> {
    const { count, error } = await this.client.from('items').select('id', { count: 'exact', head: true }).gte('fetched_at', hoursAgo(hours))
    if (error) throw new Error(`database, count items: ${error.message}`)
    return count ?? 0
  }

  // --- stories ---------------------------------------------------------------

  async recentStories(fromDay: string): Promise<RecentStory[]> {
    return must(await this.client.from('stories').select('id, title').gte('day', fromDay).order('score', { ascending: false }).limit(150), 'read recent stories') as RecentStory[]
  }

  async createStory(story: NewStory): Promise<number> {
    const row = must(await this.client.from('stories').insert(story).select('id').single(), 'create story') as { id: number }
    return row.id
  }

  async story(id: number): Promise<Story | null> {
    return must(await this.client.from('stories').select(STORY_COLUMNS).eq('id', id).maybeSingle(), 'read story') as Story | null
  }

  async updateCoverage(id: number, change: Pick<NewStory, 'links' | 'source_count' | 'coverage' | 'score'>): Promise<void> {
    must(await this.client.from('stories').update({ ...change, updated_at: new Date().toISOString() }).eq('id', id).select('id'), 'update story')
  }

  async storiesBetween(fromDay: string, toDay: string, limit: number): Promise<Story[]> {
    return must(
      await this.client.from('stories').select(STORY_COLUMNS).gte('day', fromDay).lte('day', toDay).order('score', { ascending: false }).order('id', { ascending: true }).limit(limit),
      'read stories',
    ) as Story[]
  }

  // --- digests and reviews ---------------------------------------------------

  async saveDigest(day: string, briefing: Briefing, counts: { stories: number; items: number }, model: string): Promise<void> {
    const row = { day, headline: briefing.headline, overview: briefing.overview, points: briefing.points, story_count: counts.stories, item_count: counts.items, model, updated_at: new Date().toISOString() }
    must(await this.client.from('digests').upsert(row, { onConflict: 'day' }).select('day'), 'save digest')
  }

  async saveReview(week: Week, review: Review, storyCount: number, model: string): Promise<void> {
    const row = {
      week: week.week, week_start: week.start, week_end: week.end,
      headline: review.headline, overview: review.overview, themes: review.points, watch: review.watch,
      story_count: storyCount, model, updated_at: new Date().toISOString(),
    }
    must(await this.client.from('reviews').upsert(row, { onConflict: 'week' }).select('week'), 'save review')
  }

  // --- runs ------------------------------------------------------------------

  async startRun(kind: 'daily' | 'weekly', day: string): Promise<number> {
    // A run that died without writing its end is closed here, so "running" always means now.
    must(
      await this.client.from('runs').update({ status: 'failed', error: 'interrupted', finished_at: new Date().toISOString() }).eq('status', 'running').lt('started_at', hoursAgo(2)).select('id'),
      'close old runs',
    )
    const row = must(await this.client.from('runs').insert({ kind, day }).select('id').single(), 'start run') as { id: number }
    return row.id
  }

  async finishRun(id: number, outcome: RunOutcome): Promise<void> {
    must(await this.client.from('runs').update({ ...outcome, finished_at: new Date().toISOString() }).eq('id', id).select('id'), 'finish run')
  }

  // --- housekeeping ----------------------------------------------------------

  // Article text is working material and goes after 30 days. Entries that
  // never became part of a story go after 90.
  async prune(): Promise<void> {
    must(await this.client.from('items').update({ article_text: null }).lt('article_fetched_at', hoursAgo(30 * 24)).not('article_text', 'is', null).select('id'), 'drop old article text')
    must(await this.client.from('items').delete().is('story_id', null).lt('fetched_at', hoursAgo(90 * 24)).select('id'), 'drop old items')
  }
}

// What the runs need from the database; the tests put an in-memory version in its place.
export type Store = Pick<Db, keyof Db>

export const connect = (url: string, secretKey: string): Db =>
  new Db(createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } }))
