import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="page py-12">
      <h1 className="page-title">This page does not exist</h1>
      <p className="prose-text mt-4 max-w-xl">
        The address may be mistyped, or it points at a day without a digest. <Link href="/">Today&rsquo;s digest</Link> and the <Link href="/archive">archive</Link> list
        everything there is.
      </p>
    </main>
  )
}
