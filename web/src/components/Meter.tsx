import type { CSSProperties } from 'react'

// A score from 0 to 100 as a short bar with its number.
export function Meter({ label, value, kind }: { label: string; value: number; kind: 'impact' | 'fit' }) {
  return (
    <span className="meter">
      {label}
      <span className="meter-track" aria-hidden="true">
        <span className={`meter-fill is-${kind}`} style={{ '--value': value } as CSSProperties} />
      </span>
      <b>{value}</b>
    </span>
  )
}
