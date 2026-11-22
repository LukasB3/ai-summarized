import type { MetadataRoute } from 'next'
import { days, weeks } from '@/lib/data'
import { SITE_ORIGIN } from '@/lib/site'

export const revalidate = 3600

// Every page a searcher could want. The legal pages and the search stay out.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [allDays, allWeeks] = await Promise.all([days(), weeks()])
  return [
    { url: SITE_ORIGIN, changeFrequency: 'daily' },
    { url: `${SITE_ORIGIN}/archive`, changeFrequency: 'daily' },
    { url: `${SITE_ORIGIN}/weeks`, changeFrequency: 'weekly' },
    { url: `${SITE_ORIGIN}/sources` },
    ...allDays.map((entry) => ({ url: `${SITE_ORIGIN}/d/${entry.day}` })),
    ...allWeeks.map((entry) => ({ url: `${SITE_ORIGIN}/week/${entry.week}` })),
  ]
}
