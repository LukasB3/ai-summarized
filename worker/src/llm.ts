import Anthropic from '@anthropic-ai/sdk'
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod'
import type { z } from 'zod'

// One place for every call to Claude: structured output, cost accounting and
// the per-run budget.

// Dollars per million tokens. Cache writes cost 1.25x input.
const PRICES: Record<string, { input: number; output: number; cacheRead: number }> = {
  'claude-haiku-5-5': { input: 0.1, output: 0.5, cacheRead: 0.01 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.1 },
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2 },
  'claude-fable-5-2': { input: 8, output: 40, cacheRead: 0.2 },
}
// A model missing from the table is charged at the highest known price, so
// the budget errs towards stopping early.
const UNKNOWN_PRICE = { input: 10, output: 50, cacheRead: 1 }

export interface Usage {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number | null
  cache_read_input_tokens?: number | null
}

export function costOf(model: string, usage: Usage): number {
  const price = Object.entries(PRICES).find(([id]) => model.startsWith(id))?.[1] ?? UNKNOWN_PRICE
  const written = usage.cache_creation_input_tokens ?? 0
  const read = usage.cache_read_input_tokens ?? 0
  return (usage.input_tokens * price.input + written * price.input * 1.25 + read * price.cacheRead + usage.output_tokens * price.output) / 1_000_000
}

export class BudgetExceeded extends Error {
  constructor(spent: number, budget: number) {
    super(`run budget reached: $${spent.toFixed(2)} of $${budget.toFixed(2)}`)
  }
}

export interface StageTotals {
  calls: number
  failed: number
  refused: number
  input_tokens: number
  output_tokens: number
  cost_usd: number
}

export interface AskOptions<T> {
  stage: string
  model: string
  system: string
  user: string
  schema: z.ZodType<T>
  maxTokens: number
  effort: 'low' | 'medium' | 'high'
}

export type Ask = <T>(options: AskOptions<T>) => Promise<T | null>

export class Llm {
  readonly stages: Record<string, StageTotals> = {}
  spentUsd = 0

  constructor(
    private readonly client: Anthropic,
    private readonly budgetUsd: number,
    private readonly log: (line: string) => void = console.log,
  ) {}

  get inputTokens(): number {
    return Object.values(this.stages).reduce((sum, stage) => sum + stage.input_tokens, 0)
  }

  get outputTokens(): number {
    return Object.values(this.stages).reduce((sum, stage) => sum + stage.output_tokens, 0)
  }

  // Share of the budget still available, for stages that should leave room for later ones.
  remaining(): number {
    return Math.max(0, this.budgetUsd - this.spentUsd)
  }

  // Returns the parsed answer, or null when the model gave none (refusal,
  // cut-off, API error after retries). Throws only when the budget is spent.
  ask: Ask = async <T>(options: AskOptions<T>): Promise<T | null> => {
    if (this.spentUsd >= this.budgetUsd) throw new BudgetExceeded(this.spentUsd, this.budgetUsd)
    const totals = (this.stages[options.stage] ??= { calls: 0, failed: 0, refused: 0, input_tokens: 0, output_tokens: 0, cost_usd: 0 })
    totals.calls++
    try {
      const response = await this.client.beta.messages.parse({
        model: options.model,
        max_tokens: options.maxTokens,
        // The instructions are the same for every call of a stage, so they are
        // marked for the prompt cache; what varies comes after, in the user turn.
        system: [{ type: 'text', text: options.system, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: options.user }],
        output_config: { effort: options.effort, format: betaZodOutputFormat(options.schema) },
        // If the model declines for policy reasons, the API retries once on its
        // default fallback model inside the same request.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      })
      const cost = costOf(response.model, response.usage)
      this.spentUsd += cost
      totals.cost_usd += cost
      totals.input_tokens += response.usage.input_tokens + (response.usage.cache_creation_input_tokens ?? 0) + (response.usage.cache_read_input_tokens ?? 0)
      totals.output_tokens += response.usage.output_tokens
      if (response.stop_reason === 'refusal') {
        totals.refused++
        this.log(`llm stage=${options.stage} refused category=${response.stop_details?.category ?? 'none'}`)
        return null
      }
      if (response.parsed_output === null) {
        totals.failed++
        this.log(`llm stage=${options.stage} no answer stop_reason=${response.stop_reason}`)
        return null
      }
      return response.parsed_output as T
    } catch (error) {
      totals.failed++
      // The key or the account is wrong: no later call can succeed either.
      if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) throw error
      const what = error instanceof Anthropic.APIError ? `API error ${error.status ?? 'network'}` : error instanceof Error ? error.name : 'unknown error'
      this.log(`llm stage=${options.stage} failed: ${what}`)
      return null
    }
  }
}

export const createClient = (apiKey: string): Anthropic => new Anthropic({ apiKey, maxRetries: 3, timeout: 120_000 })
