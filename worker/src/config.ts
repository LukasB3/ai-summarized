import { z } from 'zod'

// Everything that can be tuned without a code change. Values come from
// /etc/ai-summarized/worker.env on the server.

const tuning = z.object({
  TRIAGE_MODEL: z.string().default('claude-haiku-5-5'),
  SUMMARY_MODEL: z.string().default('claude-sonnet-5-5'),
  BRIEFING_MODEL: z.string().default('claude-opus-5-5'),
  // A run stops asking the model once it has spent this much.
  RUN_BUDGET_USD: z.coerce.number().positive().default(2),
  // New items sent to triage per run, newest first.
  MAX_NEW_ITEMS: z.coerce.number().int().positive().default(400),
  // Stories written per run, best triage score first.
  MAX_STORIES: z.coerce.number().int().positive().default(60),
  // Items below this triage score are stored and go no further.
  TRIAGE_THRESHOLD: z.coerce.number().int().min(0).max(100).default(40),
  // Entries older than this are ignored when collecting.
  MAX_AGE_HOURS: z.coerce.number().positive().default(48),
  WEIGHT_IMPACT: z.coerce.number().min(0).max(1).default(0.6),
  WEIGHT_FIT: z.coerce.number().min(0).max(1).default(0.4),
  USER_AGENT: z.string().default('ai-summarized/1.0 (+https://ai-summarized.lukasbossert.com/sources)'),
})

const secrets = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(20),
  ANTHROPIC_API_KEY: z.string().min(20),
})

export type Tuning = z.infer<typeof tuning>
export type Config = Tuning & z.infer<typeof secrets>

export const loadTuning = (env: NodeJS.ProcessEnv = process.env): Tuning => tuning.parse(env)

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = tuning.extend(secrets.shape).safeParse(env)
  if (parsed.success) return parsed.data
  // Name the settings that are wrong, never their values.
  const names = [...new Set(parsed.error.issues.map((issue) => issue.path.join('.')))]
  throw new Error(`missing or invalid settings: ${names.join(', ')}`)
}
