import type { Metadata } from 'next'
import { Address, LegalPage, Mail } from '@/components/Legal'

export const metadata: Metadata = { title: 'Privacy policy', robots: { index: false }, alternates: { canonical: '/privacy' } }

export default function Privacy() {
  return (
    <LegalPage title="Privacy policy">
      <h2 id="summary">In short</h2>
      <p>This site collects as little data as possible. It sets no cookies, uses no analytics, shows no advertising and builds no user profiles.</p>
      <p>Data is processed when you open a page and when you use the search. What happens then is described in the sections below.</p>

      <h2 id="controller">Controller</h2>
      <p>The controller for the processing of personal data on this site under the General Data Protection Regulation (GDPR) is:</p>
      <Address />
      <p>
        Email: <Mail />
      </p>

      <h2 id="visit">Visiting this site</h2>
      <p>
        This site is delivered by Vercel Inc. (Covina, California, USA). When you open a page, Vercel processes the data your browser transmits: IP address,
        date and time, the address requested, browser and operating system, and the referring page. This is needed to deliver the page and to protect it
        against attacks. The legal basis is my legitimate interest in running the site securely (Art. 6 (1) (f) GDPR).
      </p>
      <p>
        Vercel processes this data under its own responsibility as described in its privacy notice (
        <a href="https://vercel.com/legal/privacy-policy">vercel.com/legal/privacy-policy</a>) and is certified under the EU-US Data Privacy Framework. I do not
        analyse visits; the logs Vercel shows me reach back about one hour.
      </p>

      <h2 id="search">Search</h2>
      <p>
        When you search, the words you enter are part of the address of the results page and reach Vercel like any other page you open. The site passes them
        to its database to find matching stories. The database is run by Supabase (Supabase Pte. Ltd., Singapore) in Frankfurt, Germany. It receives the
        search words, not your IP address.
      </p>
      <p>
        I do not store your searches and do not link them to you. The legal basis is my legitimate interest in making the archive searchable (Art. 6 (1)
        (f) GDPR).
      </p>

      <h2 id="device">Stored on your device</h2>
      <p>This site sets no cookies. It stores nothing on your device.</p>

      <h2 id="recipients">Recipients and transfers outside the EU</h2>
      <p>Only the parties named in this policy receive data:</p>
      <ul>
        <li>Vercel Inc., USA: delivers the site and runs the search.</li>
        <li>Supabase Pte. Ltd., Singapore, with a database in Frankfurt, Germany: holds the stories and finds the ones a search asks for.</li>
      </ul>
      <p>
        Transfers to the USA rely on the EU-US Data Privacy Framework where the recipient is certified under it, and otherwise on the standard contractual
        clauses of the European Commission.
      </p>
      <p>Vercel is certified; Supabase uses standard contractual clauses.</p>

      <h2 id="email">Email</h2>
      <p>
        If you email me, I process your address and message in order to reply (Art. 6 (1) (b) and (f) GDPR) and delete them once they are no longer needed.
        My mailbox is with Gmail, a service of Google (Google Ireland Limited, Dublin, Ireland); Google is certified under the EU-US Data Privacy Framework.
      </p>

      <h2 id="rights">Your rights</h2>
      <p>
        You have the right of access (Art. 15 GDPR), to rectification (Art. 16), to erasure (Art. 17), to restriction of processing (Art. 18) and to data
        portability (Art. 20). To exercise a right, an email to <Mail /> is enough.
      </p>
      <p>
        You are not obliged to provide any data. Without the data named in each section, however, the function concerned cannot be used. There is no
        automated decision-making within the meaning of Art. 22 GDPR.
      </p>
      <p>
        You can also lodge a complaint with a data protection supervisory authority (Art. 77 GDPR), for example the Bavarian State Office for Data
        Protection Supervision (Bayerisches Landesamt für Datenschutzaufsicht), Promenade 18, 91522 Ansbach, Germany (
        <a href="https://www.lda.bayern.de">www.lda.bayern.de</a>).
      </p>

      <h2 id="objection">Right to object</h2>
      <p>
        Where I process data on the basis of a legitimate interest (Art. 6 (1) (f) GDPR), you can object at any time on grounds relating to your particular
        situation (Art. 21 GDPR). I then stop processing the data unless there are compelling legitimate grounds for it. An email is enough for this too.
      </p>
    </LegalPage>
  )
}
