import { readFile } from 'node:fs/promises'
import { fetchArticle } from './article.js'
import { collectAll, isFresh } from './collect/index.js'
import type { Config } from './config.js'
import { addDays, berlinDay } from './day.js'
import type { Store } from './db.js'
import { BudgetExceeded, type Llm } from './llm.js'
import { pool } from './pool.js'
import { finalScore } from './rank.js'
import { Robots } from './robots.js'
import { SOURCES, type Source } from './sources.js'
import { writeBriefing } from './stages/briefing.js'
import { buildUnits, clusterUnits, type Unit } from './stages/cluster.js'
import { primaryItem, writeStory } from './stages/summarise.js'
import { triageItem } from './stages/triage.js'
import { provenance } from './story.js'
import type { Item } from './types.js'

// The daily run: collect, triage, cluster, summarise and score, rank, brief.
// It can be started again on the same day: entries already stored are skipped,
// stories already written are kept, and only the briefing is written anew.

export interface DailyStats {
  day: string
  sources: { ok: number; failed: string[] }
  items: { seen: number; fresh: number; added: number }
  triage: { done: number; aiNews: number; noAnswer: number }
  cluster: { candidates: number; units: number; newGroups: number; repeats: number }
  stories: { written: number; notNews: number; noAnswer: number; leftForLater: number; withArticle: number }
  briefing: 'written' | 'no stories' | 'no answer' | 'skipped'
}

export interface RunResult {
  status: 'ok' | 'capped' | 'failed'
  error: string | null
  stats: unknown
}

const UNKNOWN_SOURCE = (id: string): Source => ({ id, name: id, kind: 'feed', url: '', siteUrl: '', category: 'press', weight: 0 })

// The briefing must still be affordable when the story stage is done.
const RESERVE_FOR_BRIEFING = 0.15

export const readProfile = (): Promise<string> => readFile(new URL('../profile.md', import.meta.url), 'utf8')

// The parts that reach the outside world, replaceable in tests.
export interface Outside {
  collect: typeof collectAll
  article: (url: string) => Promise<string | null>
  profile: () => Promise<string>
  now: () => Date
  log: (line: string) => void
}

export async function runDaily(cfg: Config, db: Store, llm: Llm, outside: Partial<Outside> = {}): Promise<RunResult> {
  const fetchOptions = { userAgent: cfg.USER_AGENT }
  const robots = new Robots(fetchOptions)
  const { collect = collectAll, article: readArticle = (url: string) => fetchArticle(url, robots, fetchOptions), profile: loadProfile = readProfile, now: clock = () => new Date(), log = console.log } = outside
  const day = berlinDay(clock())
  const runId = await db.startRun('daily', day)
  const stats: DailyStats = {
    day,
    sources: { ok: 0, failed: [] },
    items: { seen: 0, fresh: 0, added: 0 },
    triage: { done: 0, aiNews: 0, noAnswer: 0 },
    cluster: { candidates: 0, units: 0, newGroups: 0, repeats: 0 },
    stories: { written: 0, notNews: 0, noAnswer: 0, leftForLater: 0, withArticle: 0 },
    briefing: 'skipped',
  }
  let status: RunResult['status'] = 'ok'
  let error: string | null = null

  const sourceById = new Map(SOURCES.map((source) => [source.id, source]))
  const sourceOf = (item: Item): Source => sourceById.get(item.source_id) ?? UNKNOWN_SOURCE(item.source_id)

  try {
    // 1. Collect.
    const known = await db.sourceRows()
    const now = clock()
    const collected = await collect(SOURCES, { userAgent: cfg.USER_AGENT, maxAgeHours: cfg.MAX_AGE_HOURS, now })
    await db.saveSources(collected, known)
    for (const { source, items, error: problem } of collected) {
      if (problem) {
        stats.sources.failed.push(source.id)
        log(`collect source=${source.id} failed: ${problem}`)
        continue
      }
      stats.sources.ok++
      const fresh = items.filter((item) => isFresh(item, now, cfg.MAX_AGE_HOURS, Boolean(known.get(source.id)?.last_ok_at)))
      stats.items.seen += items.length
      stats.items.fresh += fresh.length
      stats.items.added += await db.insertItems(source, fresh)
    }
    log(`collect sources_ok=${stats.sources.ok} failed=${stats.sources.failed.length} seen=${stats.items.seen} fresh=${stats.items.fresh} added=${stats.items.added}`)

    // 2. Triage what has not been looked at yet.
    let capped = false
    const untriaged = await db.untriaged(cfg.MAX_NEW_ITEMS)
    await pool(untriaged, 6, async (item) => {
      if (capped) return
      try {
        const triage = await triageItem(llm.ask, cfg.TRIAGE_MODEL, item, sourceOf(item))
        // Without an answer the entry stays untriaged and is tried again next run.
        if (!triage) return void stats.triage.noAnswer++
        await db.saveTriage(item.id, triage)
        stats.triage.done++
        if (triage.isAiNews) stats.triage.aiNews++
      } catch (problem) {
        if (!(problem instanceof BudgetExceeded)) throw problem
        capped = true
      }
    })
    log(`triage done=${stats.triage.done} ai_news=${stats.triage.aiNews} no_answer=${stats.triage.noAnswer}`)

    // 3. Cluster the candidates into stories.
    const candidates = await db.candidates(cfg.TRIAGE_THRESHOLD)
    const units = buildUnits(candidates)
    stats.cluster.candidates = candidates.length
    stats.cluster.units = units.length
    let groups: { units: Unit[]; title: string }[] = []
    if (units.length > 0 && !capped) {
      try {
        const recent = await db.recentStories(addDays(day, -3))
        const clustered = await clusterUnits(llm.ask, cfg.SUMMARY_MODEL, units, (item) => sourceOf(item).name, recent)
        groups = clustered.fresh
        // Entries that repeat a published story join it and widen its coverage.
        for (const [storyId, repeats] of clustered.repeats) {
          const story = await db.story(storyId)
          if (!story) continue
          await db.assignToStory(repeats.flatMap((unit) => unit.items.map((item) => item.id)), storyId)
          const { links, sourceCount, coverage } = provenance(await db.itemsOfStory(storyId), sourceOf)
          await db.updateCoverage(storyId, { links, source_count: sourceCount, coverage, score: finalScore(story.impact, story.fit, coverage, { impact: cfg.WEIGHT_IMPACT, fit: cfg.WEIGHT_FIT }) })
          stats.cluster.repeats++
        }
      } catch (problem) {
        if (!(problem instanceof BudgetExceeded)) throw problem
        capped = true
      }
    }
    stats.cluster.newGroups = groups.length
    log(`cluster candidates=${candidates.length} units=${units.length} new_groups=${groups.length} repeats=${stats.cluster.repeats}`)

    // 4. Summarise and score the best groups; the rest wait for the next run.
    const score = (group: { units: Unit[] }): number => Math.max(...group.units.map((unit) => unit.score)) + 3 * (group.units.length - 1)
    const ordered = [...groups].sort((a, b) => score(b) - score(a))
    const chosen = ordered.slice(0, cfg.MAX_STORIES)
    stats.stories.leftForLater = ordered.length - chosen.length
    const profile = await loadProfile()
    await pool(chosen, 4, async (group) => {
      if (capped || llm.remaining() < cfg.RUN_BUDGET_USD * RESERVE_FOR_BRIEFING) {
        capped = true
        stats.stories.leftForLater++
        return
      }
      const items = group.units.flatMap((unit) => unit.items)
      const ids = items.map((item) => item.id)
      const primary = primaryItem(items, sourceOf)
      try {
        const article = await readArticle(primary.url)
        if (article) {
          stats.stories.withArticle++
          await db.saveArticle(primary.id, article)
        }
        const written = await writeStory(llm.ask, cfg.SUMMARY_MODEL, profile, items, sourceOf, article)
        // Without an answer the entries stay candidates and are tried again next run.
        if (!written) return void stats.stories.noAnswer++
        if (!written.isNews) {
          await db.markNotNews(ids)
          return void stats.stories.notNews++
        }
        const { links, sourceCount, coverage } = provenance(items, sourceOf)
        const storyId = await db.createStory({
          day,
          title: written.title,
          summary: written.summary,
          why_it_matters: written.whyItMatters,
          category: written.category,
          tags: written.tags,
          impact: written.impact,
          fit: written.fit,
          coverage,
          score: finalScore(written.impact, written.fit, coverage, { impact: cfg.WEIGHT_IMPACT, fit: cfg.WEIGHT_FIT }),
          score_reason: written.reason,
          links,
          source_count: sourceCount,
          primary_url: primary.url,
          model: cfg.SUMMARY_MODEL,
        })
        await db.assignToStory(ids, storyId)
        stats.stories.written++
      } catch (problem) {
        if (!(problem instanceof BudgetExceeded)) throw problem
        capped = true
        stats.stories.leftForLater++
      }
    })
    log(`stories written=${stats.stories.written} not_news=${stats.stories.notNews} no_answer=${stats.stories.noAnswer} left_for_later=${stats.stories.leftForLater} with_article=${stats.stories.withArticle}`)

    // 5. The briefing, from everything stored for today.
    const today = await db.storiesBetween(day, day, 200)
    if (today.length === 0) {
      stats.briefing = 'no stories'
    } else {
      try {
        const briefing = await writeBriefing(llm.ask, cfg.BRIEFING_MODEL, today)
        if (briefing) {
          await db.saveDigest(day, briefing, { stories: today.length, items: await db.countItemsSince(24) }, cfg.BRIEFING_MODEL)
          stats.briefing = 'written'
        } else {
          stats.briefing = 'no answer'
          status = 'failed'
          error = 'the briefing was not written'
        }
      } catch (problem) {
        if (!(problem instanceof BudgetExceeded)) throw problem
        capped = true
      }
    }
    log(`briefing ${stats.briefing} stories_today=${today.length}`)

    await db.prune()
    if (capped && status === 'ok') {
      status = 'capped'
      error = `stopped at the run budget of $${cfg.RUN_BUDGET_USD}`
    }
  } catch (problem) {
    status = 'failed'
    error = problem instanceof Error ? problem.message.slice(0, 500) : 'unknown error'
  }

  const fullStats = { ...stats, llm: llm.stages }
  await db.finishRun(runId, { status, stats: fullStats, input_tokens: llm.inputTokens, output_tokens: llm.outputTokens, cost_usd: Number(llm.spentUsd.toFixed(4)), error })
  log(`run ${status} cost=$${llm.spentUsd.toFixed(4)}${error ? ` error="${error}"` : ''}`)
  return { status, error, stats: fullStats }
}
