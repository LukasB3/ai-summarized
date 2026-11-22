import type { Metadata } from 'next'
import Link from 'next/link'
import { Address, LegalPage, Mail } from '@/components/Legal'

export const metadata: Metadata = { title: 'Legal notice', robots: { index: false }, alternates: { canonical: '/legal' } }

export default function Legal() {
  return (
    <LegalPage title="Legal notice">
      <h2 id="provider">Provider</h2>
      <p>
        Information under Section 5 of the German Digital Services Act (Digitale-Dienste-Gesetz, DDG) and Section 18 (1) of the German Interstate Media Treaty
        (Medienstaatsvertrag, MStV).
      </p>
      <Address />

      <h2 id="contact">Contact</h2>
      <p>
        Email: <Mail />
      </p>

      <h2 id="responsible">Responsible for the content</h2>
      <p>Lukas Bossert, address as above (Section 18 (2) MStV).</p>

      <h2 id="about">About this site</h2>
      <p>This website is a private, non-commercial project. It collects news about artificial intelligence, summarises it and ranks it.</p>

      <h2 id="sources">Where the stories come from</h2>
      <p>
        The stories come from the public feeds and pages of the outlets listed under <Link href="/sources">Sources</Link>. For each story this site shows a
        title, a summary written for this site and links to the reports. It does not reproduce the articles; these remain with their publishers, who hold
        the rights to them.
      </p>
      <p>
        If you publish one of these sources and do not want your reports to be summarised or linked here, an email to <Mail /> is enough.
      </p>

      <h2 id="accuracy">Accuracy</h2>
      <p>
        The summaries, the scores and the briefings are generated automatically by a language model (Claude) from Anthropic. They can be incomplete or
        wrong. The linked reports are what counts. The ranking reflects my own interests and is not a recommendation.
      </p>

      <h2 id="liability">Liability for content and links</h2>
      <p>
        I am responsible for my own content on these pages under the general laws. This site links to third-party websites whose content I do not control;
        their providers are responsible for it. If I learn of an infringement, I remove the content or link concerned without delay.
      </p>

      <h2 id="privacy">Privacy</h2>
      <p>
        What data this site processes is described in the <Link href="/privacy">privacy policy</Link>.
      </p>
    </LegalPage>
  )
}
