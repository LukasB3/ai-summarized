import type { Metadata } from 'next'
import { sources } from '@/lib/data'
import { dayAndTime, safeHref } from '@/lib/format'
import type { SourceStatus } from '@/lib/types'

export const revalidate = 300

export const metadata: Metadata = { title: 'Sources', description: 'Where the digest reads, and whether each source could be read today.', alternates: { canonical: '/sources' } }

const GROUPS: { category: SourceStatus['category']; title: string; note: string }[] = [
  { category: 'lab', title: 'Labs and vendors', note: 'Their own announcements.' },
  { category: 'press', title: 'Press', note: 'Reporting on the field.' },
  { category: 'research', title: 'Research and safety', note: 'Papers, evaluations, alignment work.' },
  { category: 'people', title: 'People', note: 'Practitioners who write regularly.' },
  { category: 'community', title: 'Community', note: 'What practitioners pass around.' },
  { category: 'releases', title: 'Releases', note: 'New versions of tools many people build on.' },
]

function status(source: SourceStatus): { text: string; failing: boolean } {
  if (source.failures === 0 && source.last_ok_at) return { text: `Read ${dayAndTime(source.last_ok_at)}`, failing: false }
  if (!source.last_ok_at) return { text: source.failures > 0 ? 'Could not be read yet' : 'Not read yet', failing: source.failures > 0 }
  return { text: `Failing; last read ${dayAndTime(source.last_ok_at)}`, failing: true }
}

export default async function Sources() {
  const all = await sources()
  const failing = all.filter((source) => status(source).failing).length

  return (
    <main className="page py-10">
      <h1 className="page-title">Sources</h1>
      <p className="prose-text mt-4 max-w-xl">
        The digest reads these {all.length} sources every morning, through their feeds wherever they have one. Only titles, our own summaries and links are
        shown here; the articles stay where they were published.
      </p>
      {all.length > 0 && <p className={failing > 0 ? 'notice mt-5' : 'quiet mt-3'}>{failing === 0 ? 'All sources could be read on the last run.' : `${failing} of ${all.length} could not be read on the last run.`} Times are Central European Time.</p>}

      {GROUPS.map((group) => {
        const members = all.filter((source) => source.category === group.category)
        if (members.length === 0) return null
        return (
          <section key={group.category} className="mt-9">
            <h2 className="section-title">{group.title}</h2>
            <p className="quiet pb-2">{group.note}</p>
            <ul className="rows">
              {members.map((source) => {
                const state = status(source)
                const href = safeHref(source.site_url)
                return (
                  <li key={source.id} style={{ gridTemplateColumns: '1fr auto' }}>
                    <span>{href ? <a href={href}>{source.name}</a> : source.name}</span>
                    <span className="when" style={state.failing ? { color: 'var(--signal-text)', fontWeight: 600 } : undefined}>
                      {state.text}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </main>
  )
}
