import assert from 'node:assert/strict'
import { test } from 'node:test'
import { ago, berlinDay, isDay, isWeek, linkTarget, listing, longDay, mediumDay, monthOf, safeHref, weekName, weekRange } from './format'
import { headlineWeight, rank, tierOf } from './rank'
import type { Story, StoryLink } from './types'

const story = (id: number, impact: number, fit: number, score: number): Story => ({
  id, day: '2026-11-22', title: `Story ${id}`, summary: '', why_it_matters: '', category: 'models', tags: [], impact, fit, coverage: 0, score,
  score_reason: '', major: impact >= 85, links: [], source_count: 1,
})

test('days and weeks are validated before they reach the database', () => {
  assert.equal(isDay('2026-11-22'), true)
  for (const bad of ['2026-13-01', '2026-02-30', '2026-1-1', 'today', '2026-11-22T00:00', '']) assert.equal(isDay(bad), false, bad)
  assert.equal(isWeek('2026-W47'), true)
  for (const bad of ['2026-W00', '2026-W54', '2026-47', '2026-W4', '']) assert.equal(isWeek(bad), false, bad)
})

test('dates read the same whatever zone the server is in', () => {
  assert.equal(longDay('2026-11-22'), 'Sunday 22 November 2026')
  assert.equal(mediumDay('2026-11-22'), 'Sun 22 Nov')
  assert.equal(monthOf('2026-11-01'), 'November 2026')
  assert.equal(weekName('2026-W07'), 'Week 7')
  assert.equal(weekRange('2026-11-16', '2026-11-22'), '16 to 22 November 2026')
  assert.equal(weekRange('2026-11-30', '2026-12-06'), '30 November to 6 December 2026')
  assert.equal(berlinDay(new Date('2026-11-22T23:30:00Z')), '2026-11-23')
})

test('ages are given in the unit that fits', () => {
  const now = new Date('2026-11-22T12:00:00Z')
  assert.equal(ago('2026-11-22T11:59:30Z', now), 'just now')
  assert.equal(ago('2026-11-22T11:15:00Z', now), '45 minutes ago')
  assert.equal(ago('2026-11-22T05:00:00Z', now), '7 hours ago')
  assert.equal(ago('2026-11-19T12:00:00Z', now), '3 days ago')
  assert.equal(ago('2026-11-23T12:00:00Z', now), 'just now')
})

test('lists read as a sentence', () => {
  assert.equal(listing([]), '')
  assert.equal(listing(['A']), 'A')
  assert.equal(listing(['A', 'B']), 'A and B')
  assert.equal(listing(['A', 'B', 'C']), 'A, B and C')
})

test('only web addresses become links', () => {
  assert.equal(safeHref('https://example.com/a'), 'https://example.com/a')
  assert.equal(safeHref('javascript:alert(1)'), null)
  assert.equal(safeHref('data:text/html,x'), null)
  assert.equal(safeHref(''), null)
})

test('a community post links to its discussion when the article is already listed', () => {
  const article: StoryLink = { source: 'openai', name: 'OpenAI', title: 't', url: 'https://openai.com/x' }
  const post: StoryLink = { source: 'hn', name: 'Hacker News', title: 't', url: 'https://openai.com/x', discussion: 'https://news.ycombinator.com/item?id=1' }
  assert.equal(linkTarget(post, [article, post]), 'https://news.ycombinator.com/item?id=1')
  // Alone, the post is the only way to the article.
  assert.equal(linkTarget(post, [post]), 'https://openai.com/x')
  assert.equal(linkTarget(article, [article, post]), 'https://openai.com/x')
})

test('major stories come first whatever their fit, then everything by score', () => {
  const ranked = rank([story(1, 60, 95, 80), story(2, 90, 10, 58), story(3, 88, 90, 92), story(4, 30, 30, 30), story(5, 60, 95, 80)])
  assert.deepEqual(ranked.map((entry) => entry.story.id), [3, 2, 1, 5, 4])
  assert.deepEqual(ranked.map((entry) => entry.rank), [1, 2, 3, 4, 5])
  assert.deepEqual(ranked.map((entry) => entry.tier), ['major', 'major', 'high', 'high', 'low'])
})

test('tiers and weights follow the scores', () => {
  assert.equal(tierOf({ impact: 85, score: 40 }), 'major')
  assert.equal(tierOf({ impact: 84, score: 65 }), 'high')
  assert.equal(tierOf({ impact: 50, score: 45 }), 'mid')
  assert.equal(tierOf({ impact: 50, score: 44 }), 'low')
  assert.equal(headlineWeight(0), 300)
  assert.equal(headlineWeight(50), 550)
  assert.equal(headlineWeight(100), 800)
  assert.equal(headlineWeight(250), 800)
})
