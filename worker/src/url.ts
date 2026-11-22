// Feed entries arrive with tracking parameters, fragments and several
// spellings of one address. canonicalUrl gives the address that is stored and
// linked; urlKey is a looser form used only to notice that two sources point
// at the same article.

const TRACKING = /^(utm_\w+|fbclid|gclid|dclid|msclkid|mc_cid|mc_eid|ref|ref_src|igshid|_hsenc|_hsmi|mkt_tok|cmpid|ncid|guccounter|guce_referrer|guce_referrer_sig|smid|ocid)$/i

export function canonicalUrl(raw: string, base?: string): string | null {
  // An empty address would resolve to the base itself: an entry without a
  // link must not end up linking to its feed.
  if (!raw.trim()) return null
  let url: URL
  try {
    url = new URL(raw.trim(), base)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (url.username || url.password) return null
  url.hash = ''
  for (const name of [...url.searchParams.keys()]) {
    if (TRACKING.test(name)) url.searchParams.delete(name)
  }
  url.searchParams.sort()
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) url.pathname = url.pathname.slice(0, -1)
  return url.toString()
}

export function urlKey(canonical: string): string {
  const url = new URL(canonical)
  const host = url.hostname.replace(/^(www|m|amp)\./, '')
  const path = url.pathname.replace(/\/(amp|index\.html?)$/, '').replace(/\/$/, '')
  return `${host}${path}${url.search}`.toLowerCase()
}

export const hostOf = (url: string): string => new URL(url).hostname.replace(/^www\./, '')
