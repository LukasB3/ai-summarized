import type { Config } from './config.js'
import { berlinDay, isoWeek } from './day.js'
import type { RunResult } from './daily.js'
import type { Store } from './db.js'
import { BudgetExceeded, type Llm } from './llm.js'
import { MAX_STORIES_IN_REVIEW, writeReview } from './stages/briefing.js'

// The weekly review: one text about the week (Monday to Sunday) that contains
// today, written from that week's highest-ranked stories.

// Below this there is no week to review.
const MIN_STORIES = 5

export async function runWeekly(cfg: Config, db: Store, llm: Llm, now: Date = new Date(), log: (line: string) => void = console.log): Promise<RunResult> {
  const day = berlinDay(now)
  const week = isoWeek(day)
  const runId = await db.startRun('weekly', day)
  let status: RunResult['status'] = 'ok'
  let error: string | null = null
  let outcome = 'skipped'
  let storyCount = 0

  try {
    const stories = await db.storiesBetween(week.start, week.end, MAX_STORIES_IN_REVIEW)
    storyCount = stories.length
    if (stories.length < MIN_STORIES) {
      outcome = 'too few stories'
    } else {
      const review = await writeReview(llm.ask, cfg.BRIEFING_MODEL, stories)
      if (review) {
        await db.saveReview(week, review, stories.length, cfg.BRIEFING_MODEL)
        outcome = 'written'
      } else {
        outcome = 'no answer'
        status = 'failed'
        error = 'the review was not written'
      }
    }
  } catch (problem) {
    status = problem instanceof BudgetExceeded ? 'capped' : 'failed'
    error = problem instanceof Error ? problem.message.slice(0, 500) : 'unknown error'
  }

  const stats = { week: week.week, stories: storyCount, review: outcome, llm: llm.stages }
  await db.finishRun(runId, { status, stats, input_tokens: llm.inputTokens, output_tokens: llm.outputTokens, cost_usd: Number(llm.spentUsd.toFixed(4)), error })
  log(`weekly ${week.week} review=${outcome} stories=${storyCount} status=${status} cost=$${llm.spentUsd.toFixed(4)}${error ? ` error="${error}"` : ''}`)
  return { status, error, stats }
}
