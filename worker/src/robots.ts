import { fetchText, type FetchOptions } from './http.js'

// A small robots.txt reader. Feeds are published to be read; article pages are
// only fetched where the site's robots.txt allows this crawler. Supports
// User-agent groups, Allow, Disallow, `*` and a trailing `$`.

interface Rule {
  allow: boolean
  pattern: string
}

export const AGENT_TOKEN = 'ai-summarized'

export function parseRobots(text: string, agent: string = AGENT_TOKEN): Rule[] {
  const groups: { agents: string[]; rules: Rule[] }[] = []
  let current: { agents: string[]; rules: Rule[] } | null = null
  let lastWasAgent = false
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim()
    const colon = line.indexOf(':')
    if (colon < 0) continue
    const field = line.slice(0, colon).trim().toLowerCase()
    const value = line.slice(colon + 1).trim()
    if (field === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] }
        groups.push(current)
      }
      current.agents.push(value.toLowerCase())
      lastWasAgent = true
    } else if ((field === 'allow' || field === 'disallow') && current) {
      lastWasAgent = false
      // An empty Disallow allows everything and needs no rule.
      if (value) current.rules.push({ allow: field === 'allow', pattern: value })
    } else {
      lastWasAgent = false
    }
  }
  const own = groups.filter((group) => group.agents.some((name) => name !== '*' && agent.toLowerCase().includes(name)))
  const chosen = own.length > 0 ? own : groups.filter((group) => group.agents.includes('*'))
  return chosen.flatMap((group) => group.rules)
}

function matches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith('$')
  const body = anchored ? pattern.slice(0, -1) : pattern
  const source = body.split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')
  return new RegExp(`^${source}${anchored ? '$' : ''}`).test(path)
}

// The longest matching rule wins; on a tie Allow wins. No rule means allowed.
export function isAllowed(rules: Rule[], path: string): boolean {
  let best: Rule | null = null
  for (const rule of rules) {
    if (!matches(rule.pattern, path)) continue
    if (!best || rule.pattern.length > best.pattern.length || (rule.pattern.length === best.pattern.length && rule.allow)) best = rule
  }
  return best ? best.allow : true
}

export class Robots {
  private readonly hosts = new Map<string, Promise<Rule[] | null>>()

  constructor(private readonly options: FetchOptions) {}

  // null: the site's rules could not be read, so its pages are left alone.
  private rules(origin: string): Promise<Rule[] | null> {
    let cached = this.hosts.get(origin)
    if (!cached) {
      cached = fetchText(`${origin}/robots.txt`, { ...this.options, timeoutMs: 8000, maxBytes: 500_000 })
        .then((res) => {
          if (res.status >= 200 && res.status < 300) return parseRobots(res.text)
          // No robots.txt means no restrictions; an error on the server's side means "do not crawl now".
          return res.status >= 400 && res.status < 500 ? [] : null
        })
        .catch(() => null)
      this.hosts.set(origin, cached)
    }
    return cached
  }

  async allows(url: string): Promise<boolean> {
    const { origin, pathname, search } = new URL(url)
    const rules = await this.rules(origin)
    return rules !== null && isAllowed(rules, `${pathname}${search}`)
  }
}
