import type { ReactNode } from 'react'

// The legal notice and the privacy policy follow one outline shared with
// lukasbossert.com, fahrplan-ulm.de and the app generator: the same sections
// in the same order under the same ids, and the same words wherever the facts
// are the same. A shared paragraph is changed on all sites in one round; the
// ids never change once live. The pages are noindex and stay out of the sitemap.

export const EMAIL = 'bossert.dev@gmail.com'
export const UPDATED = 'Last updated: November 2026'

export const Mail = () => <a href={`mailto:${EMAIL}`}>{EMAIL}</a>

export function Address() {
  return (
    <address>
      Lukas Bossert
      <br />
      Marienstraße 10
      <br />
      89231 Neu-Ulm
      <br />
      Germany
    </address>
  )
}

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="page legal py-10">
      <h1 className="page-title">{title}</h1>
      {children}
      <p className="quiet">{UPDATED}</p>
    </main>
  )
}
