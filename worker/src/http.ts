import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

// Every address the worker fetches comes from a feed, so from the web. A feed
// entry must not be able to point the server at itself, its private network or
// the cloud metadata service: what is fetched ends up in a public summary.

export class FetchError extends Error {}

export interface Fetched {
  status: number
  url: string
  contentType: string
  text: string
}

export interface FetchOptions {
  userAgent: string
  timeoutMs?: number
  maxBytes?: number
  accept?: string
}

const MAX_REDIRECTS = 5

function isPrivateV4(address: string): boolean {
  const [a = 0, b = 0] = address.split('.').map(Number)
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19))
  )
}

export function isPrivateAddress(address: string): boolean {
  const family = isIP(address)
  if (family === 4) return isPrivateV4(address)
  if (family !== 6) return true
  const lower = address.toLowerCase()
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped?.[1]) return isPrivateV4(mapped[1])
  // Loopback, unspecified, unique local (fc00::/7), link local (fe80::/10),
  // multicast (ff00::/8) and IPv4-mapped addresses in hex form.
  return lower === '::1' || lower === '::' || /^(f[cd]|fe[89ab]|ff)/.test(lower) || lower.startsWith('::ffff:')
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new FetchError('not a URL')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new FetchError('not http(s)')
  if (url.port && url.port !== '80' && url.port !== '443') throw new FetchError('unusual port')
  if (url.username || url.password) throw new FetchError('credentials in URL')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true }).catch(() => [])).map((entry) => entry.address)
  if (addresses.length === 0) throw new FetchError('host does not resolve')
  if (addresses.some(isPrivateAddress)) throw new FetchError('private address')
  return url
}

async function readCapped(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return ''
  const chunks: Uint8Array[] = []
  let size = 0
  for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
    size += chunk.byteLength
    if (size > maxBytes) throw new FetchError('response too large')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

export async function fetchText(raw: string, options: FetchOptions): Promise<Fetched> {
  const { userAgent, timeoutMs = 12_000, maxBytes = 3_000_000, accept = '*/*' } = options
  const signal = AbortSignal.timeout(timeoutMs)
  let target = raw
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const url = await assertPublicUrl(target)
      const response = await fetch(url, {
        redirect: 'manual',
        signal,
        headers: { 'user-agent': userAgent, accept, 'accept-language': 'en' },
      })
      const location = response.headers.get('location')
      if (response.status >= 300 && response.status < 400 && location) {
        await response.body?.cancel()
        target = new URL(location, url).toString()
        continue
      }
      const text = await readCapped(response, maxBytes)
      return { status: response.status, url: url.toString(), contentType: response.headers.get('content-type') ?? '', text }
    }
    throw new FetchError('too many redirects')
  } catch (error) {
    if (error instanceof FetchError) throw error
    const name = error instanceof Error ? error.name : 'Error'
    throw new FetchError(name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : `network error (${name})`)
  }
}

export async function fetchOk(raw: string, options: FetchOptions): Promise<Fetched> {
  const fetched = await fetchText(raw, options)
  if (fetched.status < 200 || fetched.status >= 300) throw new FetchError(`HTTP ${fetched.status}`)
  return fetched
}
