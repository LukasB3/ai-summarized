import type { CSSProperties } from 'react'
import { linkTarget, outletsOf, safeHref } from '@/lib/format'
import { headlineWeight, type Ranked } from '@/lib/rank'
import { CATEGORY_NAMES } from '@/lib/types'
import { Meter } from './Meter'

const MAX_OUTLETS = 8

// One story of a day. `showDay` adds the date, for lists that span days.
export function StoryItem({ ranked, showDay }: { ranked: Ranked; showDay?: string }) {
  const { story, rank, tier } = ranked
  const primary = safeHref(story.links[0]?.url ?? '')
  const named = outletsOf(story.links)
  const outlets = named.slice(0, MAX_OUTLETS)
  const more = named.length - outlets.length
  const style = { '--weight': headlineWeight(story.impact), '--rank': rank } as CSSProperties

  return (
    <li id={`s-${story.id}`} className="story" data-category={story.category} data-tier={tier} style={style}>
      <div>
        <span className="rank" aria-label={`Rank ${rank}`}>
          {rank}
        </span>
        {tier === 'major' && <span className="major-mark"> Major</span>}
      </div>
      <h3 className="headline">{primary ? <a href={primary}>{story.title}</a> : story.title}</h3>
      <p className="summary">{story.summary}</p>
      {tier !== 'low' && story.why_it_matters && (
        <p className="why">
          <b>Why it matters.</b> {story.why_it_matters}
        </p>
      )}
      <div className="facts">
        <span className="category">{CATEGORY_NAMES[story.category]}</span>
        <Meter label="Impact" value={story.impact} kind="impact" />
        <Meter label="Fit" value={story.fit} kind="fit" />
        <span>
          Score <b style={{ color: 'var(--ink)', fontWeight: 650 }}>{story.score}</b>
        </span>
        {showDay && <span>{showDay}</span>}
      </div>
      {outlets.length > 0 && (
        <p className="reported">
          Reported by{' '}
          {outlets.map((link, index) => {
            const href = safeHref(linkTarget(link, story.links))
            const points = link.points ? ` (${link.points} points)` : ''
            const separator = index === 0 ? '' : index === outlets.length - 1 && more === 0 ? ' and ' : ', '
            return (
              <span key={`${link.source}-${link.url}`}>
                {separator}
                {href ? <a href={href}>{link.name}</a> : link.name}
                {points}
              </span>
            )
          })}
          {more > 0 && ` and ${more} more`}
        </p>
      )}
      {tier !== 'low' && story.score_reason && <p className="reason">{story.score_reason}</p>}
    </li>
  )
}
