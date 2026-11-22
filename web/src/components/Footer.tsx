import Link from 'next/link'

export function Footer() {
  return (
    <footer className="page">
      <div className="footer quiet">
        <p style={{ maxWidth: '40rem' }}>
          Every morning this site reads about forty sources, merges reports about the same event into one story, and has Claude summarise and score each
          one. Impact is how much a story changes the field on its own. Fit is how well it matches the interests of the person who runs this site. The
          order is 60 percent impact, 40 percent fit, plus up to 10 points when several outlets report it. Summaries are written by a model and can be
          wrong; the sources are linked under every story.
        </p>
        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1">
          <Link href="/sources">Sources</Link>
          <Link href="/legal">Legal notice</Link>
          <Link href="/privacy">Privacy</Link>
          <a href="https://github.com/LukasB3/ai-summarized">Code on GitHub</a>
        </p>
      </div>
    </footer>
  )
}
