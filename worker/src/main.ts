import { collectAll, isFresh } from './collect/index.js'
import { loadConfig, loadTuning } from './config.js'
import { runDaily } from './daily.js'
import { connect } from './db.js'
import { createClient, Llm } from './llm.js'
import { SOURCES } from './sources.js'
import { runWeekly } from './weekly.js'

// Usage: node dist/main.js <daily | weekly | collect [source-id ...]>
//   daily    the full daily run
//   weekly   the weekly review
//   collect  read the sources and print what they hold; touches neither the
//            database nor the model, so it costs nothing

const USAGE = 'usage: main.js <daily | weekly | collect [source-id ...]>'

async function collectOnly(ids: string[]): Promise<number> {
  const tuning = loadTuning()
  const sources = ids.length > 0 ? SOURCES.filter((source) => ids.includes(source.id)) : SOURCES
  const unknown = ids.filter((id) => !SOURCES.some((source) => source.id === id))
  if (unknown.length > 0) {
    console.error(`unknown source: ${unknown.join(', ')}`)
    return 2
  }
  const now = new Date()
  const collected = await collectAll(sources, { userAgent: tuning.USER_AGENT, maxAgeHours: tuning.MAX_AGE_HOURS, now })
  let failed = 0
  let fresh = 0
  for (const { source, items, error } of collected) {
    if (error) {
      failed++
      console.log(`FAILED  ${source.id.padEnd(24)} ${error}`)
      continue
    }
    const recent = items.filter((item) => isFresh(item, now, tuning.MAX_AGE_HOURS, true))
    fresh += recent.length
    const sample = (recent[0] ?? items[0])?.title ?? ''
    console.log(`ok      ${source.id.padEnd(24)} ${String(items.length).padStart(4)} entries, ${String(recent.length).padStart(3)} recent  ${sample.slice(0, 70)}`)
  }
  console.log(`\n${collected.length - failed} of ${collected.length} sources ok, ${fresh} entries from the last ${tuning.MAX_AGE_HOURS} hours`)
  return failed === collected.length ? 1 : 0
}

async function main(): Promise<number> {
  const [command, ...rest] = process.argv.slice(2)
  if (command === 'collect') return collectOnly(rest)
  if (command !== 'daily' && command !== 'weekly') {
    console.error(USAGE)
    return 2
  }
  const cfg = loadConfig()
  const db = connect(cfg.SUPABASE_URL, cfg.SUPABASE_SECRET_KEY)
  const llm = new Llm(createClient(cfg.ANTHROPIC_API_KEY), cfg.RUN_BUDGET_USD)
  const result = command === 'daily' ? await runDaily(cfg, db, llm) : await runWeekly(cfg, db, llm)
  return result.status === 'failed' ? 1 : 0
}

main().then(
  (code) => {
    process.exitCode = code
  },
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : 'unknown error')
    process.exitCode = 1
  },
)
