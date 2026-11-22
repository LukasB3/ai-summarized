'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/', label: 'Today', match: (path: string) => path === '/' || path.startsWith('/d/') },
  { href: '/archive', label: 'Archive', match: (path: string) => path === '/archive' },
  { href: '/weeks', label: 'Weeks', match: (path: string) => path === '/weeks' || path.startsWith('/week/') },
  { href: '/search', label: 'Search', match: (path: string) => path === '/search' },
  { href: '/sources', label: 'Sources', match: (path: string) => path === '/sources' },
]

export function Masthead() {
  const path = usePathname()
  return (
    <header className="page">
      <div className="masthead">
        <Link href="/" className="wordmark">
          AI, summarized
        </Link>
        <nav className="nav" aria-label="Sections">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} aria-current={link.match(path) ? 'page' : undefined}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
