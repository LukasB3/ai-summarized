import { fetchText } from './http.js'

// The site keeps its rendered pages and re-renders one only when somebody asks
// for it and it is older than five minutes; whoever asks then still gets the
// old page. Without this, the first reader of the morning would see yesterday.
// So after a run the worker asks for the pages itself and waits until the
// front page shows the new day.

export type Get = (url: string) => Promise<{ status: number; text: string }>

export interface Refresh {
  // Pages to ask for once; each request starts that page's re-render.
  paths: string[]
  // The page that must change, and the text it must then contain.
  check: { path: string; contains: string }
}

// Seconds to wait before each look at the checked page. A page rendered just
// before the run is not re-rendered for five minutes, so the later tries are
// a minute apart.
export const WAITS = [8, 8, 60, 60, 60, 60, 60, 60]

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

export async function refreshSite(siteUrl: string, refresh: Refresh, get: Get, wait: (ms: number) => Promise<void> = sleep): Promise<boolean> {
  const address = (path: string): string => new URL(path, siteUrl).toString()
  const shows = async (): Promise<boolean> => {
    try {
      const page = await get(address(refresh.check.path))
      return page.status === 200 && page.text.toLowerCase().includes(refresh.check.contains.toLowerCase())
    } catch {
      return false
    }
  }
  // A failed request only means that page is re-rendered by its next visitor.
  await Promise.all(refresh.paths.map((path) => get(address(path)).catch(() => null)))
  for (const seconds of WAITS) {
    await wait(seconds * 1000)
    if (await shows()) return true
  }
  return false
}

export const siteGet = (userAgent: string): Get => async (url) => {
  const page = await fetchText(url, { userAgent, accept: 'text/html', timeoutMs: 20_000 })
  return { status: page.status, text: page.text }
}

export const dailyRefresh = (day: string): Refresh => ({
  paths: ['/', `/d/${day}`, '/archive', '/sources', '/sitemap.xml'],
  check: { path: '/', contains: `datetime="${day}"` },
})

export const weeklyRefresh = (week: string): Refresh => ({
  paths: ['/weeks', `/week/${week}`, '/sitemap.xml'],
  check: { path: '/weeks', contains: `/week/${week}` },
})
