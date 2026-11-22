import type Anthropic from '@anthropic-ai/sdk'
import type { Collected } from '../src/collect/index.js'
import type { Config } from '../src/config.js'
import type { NewStory, RunOutcome, Store } from '../src/db.js'
import type { RawItem } from '../src/feeds.js'
import type { Source } from '../src/sources.js'
import type { Item, Story } from '../src/types.js'

// Stand-ins for the database and for Claude, so a whole run can be tested
// without either.

export const config = (overrides: Partial<Config> = {}): Config => ({
  TRIAGE_MODEL: 'claude-haiku-5-5',
  SUMMARY_MODEL: 'claude-sonnet-5-5',
  BRIEFING_MODEL: 'claude-opus-5-5',
  RUN_BUDGET_USD: 2,
  MAX_NEW_ITEMS: 400,
  MAX_STORIES: 60,
  TRIAGE_THRESHOLD: 40,
  MAX_AGE_HOURS: 48,
  WEIGHT_IMPACT: 0.6,
  WEIGHT_FIT: 0.4,
  USER_AGENT: 'test',
  SITE_URL: '',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SECRET_KEY: 'sb_secret_test_test_test_test',
  ANTHROPIC_API_KEY: 'sk-ant-test-test-test-test',
  ...overrides,
})

interface StoredItem extends Item {
  is_ai_news: boolean | null
  triaged_at: string | null
  article_text: string | null
}

interface StoredStory extends Story, Pick<NewStory, 'primary_url' | 'model'> {}

export class MemoryStore implements Store {
  items: StoredItem[] = []
  stories: StoredStory[] = []
  digests = new Map<string, { headline: string; overview: string; points: unknown[]; story_count: number; item_count: number }>()
  reviews = new Map<string, { headline: string; watch: string; story_count: number }>()
  runs: ({ id: number; kind: string; day: string } & Partial<RunOutcome>)[] = []
  sources = new Map<string, { id: string; last_ok_at: string | null; last_error_at: string | null; failures: number; enabled: boolean; last_error: string | null }>()
  pruned = 0

  async sourceRows() {
    return new Map([...this.sources].map(([id, row]) => [id, { id, last_ok_at: row.last_ok_at, last_error_at: row.last_error_at, failures: row.failures }]))
  }

  async saveSources(collected: Collected[]) {
    const now = new Date().toISOString()
    for (const { source, error } of collected) {
      const before = this.sources.get(source.id)
      this.sources.set(source.id, {
        id: source.id,
        enabled: true,
        last_ok_at: error ? (before?.last_ok_at ?? null) : now,
        last_error: error,
        last_error_at: error ? now : (before?.last_error_at ?? null),
        failures: error ? (before?.failures ?? 0) + 1 : 0,
      })
    }
  }

  async insertItems(source: Source, items: RawItem[]) {
    let added = 0
    for (const item of items) {
      if (this.items.some((known) => known.source_id === source.id && known.url === item.url)) continue
      this.items.push({
        id: this.items.length + 1, source_id: source.id, url: item.url, title: item.title, excerpt: item.excerpt,
        published_at: item.publishedAt?.toISOString() ?? null, points: item.points ?? null, discussion_url: item.discussionUrl ?? null,
        triage_score: null, story_id: null, is_ai_news: null, triaged_at: null, article_text: null,
      })
      added++
    }
    return added
  }

  async untriaged(limit: number) {
    return this.items.filter((item) => item.triaged_at === null).slice(0, limit)
  }

  async saveTriage(id: number, triage: { isAiNews: boolean; score: number }) {
    Object.assign(this.item(id), { is_ai_news: triage.isAiNews, triage_score: triage.score, triaged_at: 'now' })
  }

  async candidates(threshold: number) {
    return this.items.filter((item) => item.story_id === null && item.is_ai_news === true && (item.triage_score ?? 0) >= threshold).sort((a, b) => (b.triage_score ?? 0) - (a.triage_score ?? 0))
  }

  async itemsOfStory(storyId: number) {
    return this.items.filter((item) => item.story_id === storyId)
  }

  async assignToStory(itemIds: number[], storyId: number) {
    for (const id of itemIds) this.item(id).story_id = storyId
  }

  async markNotNews(itemIds: number[]) {
    for (const id of itemIds) this.item(id).is_ai_news = false
  }

  async saveArticle(itemId: number, text: string) {
    this.item(itemId).article_text = text
  }

  async countItemsSince() {
    return this.items.length
  }

  async recentStories(fromDay: string) {
    return this.stories.filter((story) => story.day >= fromDay).map(({ id, title }) => ({ id, title }))
  }

  async createStory(story: NewStory) {
    const id = this.stories.length + 1
    this.stories.push({ ...story, id })
    return id
  }

  async story(id: number) {
    return this.stories.find((story) => story.id === id) ?? null
  }

  async updateCoverage(id: number, change: Pick<NewStory, 'links' | 'source_count' | 'coverage' | 'score'>) {
    Object.assign(this.stories.find((story) => story.id === id) as StoredStory, change)
  }

  async storiesBetween(fromDay: string, toDay: string, limit: number) {
    return this.stories.filter((story) => story.day >= fromDay && story.day <= toDay).sort((a, b) => b.score - a.score || a.id - b.id).slice(0, limit)
  }

  async saveDigest(day: string, briefing: { headline: string; overview: string; points: unknown[] }, counts: { stories: number; items: number }) {
    this.digests.set(day, { ...briefing, story_count: counts.stories, item_count: counts.items })
  }

  async saveReview(week: { week: string }, review: { headline: string; watch: string }, storyCount: number) {
    this.reviews.set(week.week, { headline: review.headline, watch: review.watch, story_count: storyCount })
  }

  async startRun(kind: 'daily' | 'weekly', day: string) {
    const id = this.runs.length + 1
    this.runs.push({ id, kind, day })
    return id
  }

  async finishRun(id: number, outcome: RunOutcome) {
    Object.assign(this.runs.find((run) => run.id === id) as object, outcome)
  }

  async prune() {
    this.pruned++
  }

  private item(id: number): StoredItem {
    return this.items.find((item) => item.id === id) as StoredItem
  }
}

// --- Claude ------------------------------------------------------------------

export type Stage = 'triage' | 'cluster' | 'summarise' | 'briefing' | 'review'

const stageOf = (system: string): Stage => {
  if (system.startsWith('You sort entries')) return 'triage'
  if (system.startsWith('You group feed entries')) return 'cluster'
  if (system.startsWith('You write one entry')) return 'summarise'
  if (system.startsWith('You write the opening briefing')) return 'briefing'
  if (system.startsWith('You write the weekly review')) return 'review'
  throw new Error(`unknown prompt: ${system.slice(0, 40)}`)
}

export interface Call {
  stage: Stage
  model: string
  user: string
}

export type Reply = unknown | { refuse: true } | { fail: true }

// A client whose only method is the one the worker uses. `answers` decides
// what each stage returns; every call is recorded.
export function fakeClaude(answers: (call: Call) => Reply, usage = { input_tokens: 1000, output_tokens: 200 }) {
  const calls: Call[] = []
  const client = {
    beta: {
      messages: {
        parse: async (params: { model: string; system: { text: string }[]; messages: { content: string }[] }) => {
          const call = { stage: stageOf(params.system[0]?.text ?? ''), model: params.model, user: params.messages[0]?.content ?? '' }
          calls.push(call)
          const reply = answers(call) as { refuse?: true; fail?: true } | null
          if (reply?.fail) throw new Error('boom')
          const refused = Boolean(reply?.refuse)
          return {
            model: params.model,
            usage,
            stop_reason: refused ? 'refusal' : 'end_turn',
            stop_details: refused ? { type: 'refusal', category: 'frontier_llm' } : null,
            parsed_output: refused ? null : reply,
          }
        },
      },
    },
  }
  return { client: client as unknown as Anthropic, calls }
}

export const feedSource = (id: string, category: Source['category'] = 'press'): Source => ({ id, name: id, kind: 'feed', url: `https://${id}.example/feed`, siteUrl: `https://${id}.example`, category, weight: 1 })
