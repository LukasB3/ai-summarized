// Turning markup from feeds into plain text, and keeping web text from
// closing the tags that fence it in a prompt.

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—',
  hellip: '…', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
}

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    if (body.startsWith('#')) {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10)
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ' '
    }
    return ENTITIES[body.toLowerCase()] ?? whole
  })
}

export function plainText(html: string, maxLength = 1000): string {
  const text = decodeEntities(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]*>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim()
  return clip(text, maxLength)
}

export function clip(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  const cut = text.slice(0, maxLength)
  const space = cut.lastIndexOf(' ')
  return `${space > maxLength * 0.6 ? cut.slice(0, space) : cut}…`
}

// Text from the web goes into prompts between tags. It must not be able to
// close them or open new ones.
export const fenced = (text: string): string => text.replace(/[<>]/g, (c) => (c === '<' ? '‹' : '›'))
