import type { NextConfig } from 'next'

// Pages are prebuilt and carry Next's inline bootstrap scripts; a nonce would
// need every page rendered per request. So inline scripts are allowed and
// everything else is pinned to this site. The browser talks to nobody else:
// data is read on the server, fonts are served from here.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "font-src 'self'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
  // The development server needs eval for hot reloading.
  ...(process.env.NODE_ENV === 'production' ? [{ key: 'Content-Security-Policy', value: contentSecurityPolicy }] : []),
]

const config: NextConfig = {
  poweredByHeader: false,
  headers: async () => [{ source: '/(.*)', headers: securityHeaders }],
}

export default config
