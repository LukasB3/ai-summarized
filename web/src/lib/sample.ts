import type { Digest, Review, SourceStatus, Story, StoryLink } from './types'

// Invented data for the development server when no database is configured.
// Every company, model and paper here is made up; nothing below is news.

const link = (source: string, name: string, url: string, extra: Partial<StoryLink> = {}): StoryLink => ({ source, name, title: 'Sample report', url, ...extra })

const story = (id: number, day: string, fields: Omit<Story, 'id' | 'day' | 'major' | 'source_count'>): Story => ({
  id, day, ...fields, major: fields.impact >= 85, source_count: new Set(fields.links.map((entry) => entry.source)).size,
})

const TODAY = '2026-11-22'
const YESTERDAY = '2026-11-21'

export const SAMPLE_STORIES: Story[] = [
  story(1, TODAY, {
    title: 'Northwind Labs releases Atlas, a new model family with a two-million-token context',
    summary: 'Northwind Labs released Atlas in three sizes, its first new model family in two years. The largest reads two million tokens at once and scores 14 points above the previous version on the lab’s agentic coding benchmark. All three are available through the API today.',
    why_it_matters: 'A new generation from a major lab resets what long-running agents can hold in view, and competitors usually answer within weeks.',
    category: 'models', tags: ['northwind labs', 'atlas', 'context window'], impact: 92, fit: 95, coverage: 9, score: 100,
    score_reason: 'A new model family from a major lab, squarely in the reader’s first interest and reported by eight outlets.',
    links: [
      link('lab', 'Northwind Labs', 'https://example.com/atlas'),
      link('press-a', 'The Ledger', 'https://example.com/ledger-atlas'),
      link('press-b', 'Circuit', 'https://example.com/circuit-atlas'),
      link('hn', 'Hacker News', 'https://example.com/atlas', { discussion: 'https://example.com/hn/1', points: 1240 }),
    ],
  }),
  story(2, TODAY, {
    title: 'Interpretability team traces a planning circuit across forty layers',
    summary: 'Researchers at the Meridian Institute mapped how a production model plans several steps ahead, following one circuit through forty layers. Disabling it removed multi-step planning while leaving single-step answers intact.',
    why_it_matters: 'It is the most complete account so far of where planning lives inside a deployed model, which safety evaluations could target directly.',
    category: 'safety', tags: ['interpretability', 'meridian institute'], impact: 86, fit: 88, coverage: 3, score: 90,
    score_reason: 'Strong evidence on an open question in interpretability, one of the reader’s highest interests.',
    links: [link('research', 'Meridian Institute', 'https://example.com/planning'), link('press-a', 'The Ledger', 'https://example.com/ledger-planning')],
  }),
  story(3, TODAY, {
    title: 'Coding agent Harbor adds parallel sessions and a review mode',
    summary: 'Version 3 of the Harbor coding agent runs several sessions on one repository at once and adds a mode that reviews its own diff before proposing it. The release is free for existing users.',
    why_it_matters: 'Parallel sessions change how much one developer can delegate at a time; review mode targets the most common complaint about agent output.',
    category: 'tools', tags: ['harbor', 'coding agents'], impact: 62, fit: 90, coverage: 5, score: 78,
    score_reason: 'A meaningful release of a widely used developer tool, directly in the reader’s second interest.',
    links: [link('lab', 'Harbor', 'https://example.com/harbor-3'), link('people', 'Field Notes', 'https://example.com/notes-harbor'), link('hn', 'Hacker News', 'https://example.com/harbor-3', { discussion: 'https://example.com/hn/2', points: 410 })],
  }),
  story(4, TODAY, {
    title: 'Study finds models report internal states more accurately than chance',
    summary: 'A preprint from two universities tested whether models can describe their own activations. Reports matched measured states in 71 percent of cases, against a 50 percent baseline, and fell sharply when the question was rephrased.',
    why_it_matters: 'The result bears on whether self-reports can count as evidence in model welfare research; the authors caution it does not show experience.',
    category: 'research', tags: ['introspection', 'model welfare'], impact: 58, fit: 86, coverage: 0, score: 69,
    score_reason: 'Solid but early research on a topic the reader follows closely; one source and not yet replicated.',
    links: [link('papers', 'Daily Papers', 'https://example.com/introspection', { points: 96 })],
  }),
  story(5, TODAY, {
    title: 'Regulators publish final guidance on general-purpose model obligations',
    summary: 'The final guidance sets out what providers of general-purpose models must document from next August, including training data summaries and incident reporting within fifteen days.',
    why_it_matters: 'It turns a law into concrete duties with a date, and applies to every provider that offers models in the region.',
    category: 'policy', tags: ['regulation', 'compliance'], impact: 72, fit: 45, coverage: 3, score: 64,
    score_reason: 'A policy move with field-wide reach, though outside the reader’s main interests.',
    links: [link('press-b', 'Circuit', 'https://example.com/guidance'), link('press-c', 'Policy Wire', 'https://example.com/wire-guidance')],
  }),
  story(6, TODAY, {
    title: 'Open-weights model Tern 4 matches closed models on multilingual benchmarks',
    summary: 'The Tern project released version 4 under a permissive licence. On twelve multilingual benchmarks it lands within two points of the leading closed models and runs on a single consumer graphics card.',
    why_it_matters: 'A capable model that anyone can run locally widens what small teams can build without an API contract.',
    category: 'models', tags: ['tern', 'open weights'], impact: 66, fit: 80, coverage: 0, score: 72,
    score_reason: 'A significant open release in the reader’s first interest, reported so far only by the project.',
    links: [link('lab', 'Tern Project', 'https://example.com/tern-4')],
  }),
  story(7, TODAY, {
    title: 'Evaluation group measures a doubling of autonomous task length in seven months',
    summary: 'A new report tracks the length of software tasks that models complete without help. The median has doubled in seven months and now stands at about nine hours of human work.',
    why_it_matters: 'Task length is the clearest public trend line for what agents can be trusted with, and it is still rising.',
    category: 'safety', tags: ['evaluations', 'autonomy'], impact: 70, fit: 82, coverage: 3, score: 78,
    score_reason: 'A major measured trend from a credible evaluator, relevant to both agents and risk.',
    links: [link('research', 'Lantern Evals', 'https://example.com/task-length'), link('people', 'Field Notes', 'https://example.com/notes-task-length')],
  }),
  story(8, TODAY, {
    title: 'Inference startup raises a large round to build regional data centres',
    summary: 'The company raised new funding to build inference capacity in three regions. It did not name customers or a timeline.',
    why_it_matters: 'More regional capacity may lower latency and cost eventually; for now it is a financing announcement.',
    category: 'business', tags: ['funding', 'inference'], impact: 38, fit: 18, coverage: 3, score: 33,
    score_reason: 'A funding round without product detail, one of the reader’s lower interests.',
    links: [link('press-a', 'The Ledger', 'https://example.com/round'), link('press-b', 'Circuit', 'https://example.com/circuit-round')],
  }),
  story(9, TODAY, {
    title: 'Library update adds streaming tool results to an agent framework',
    summary: 'A point release of the Quay framework lets tools stream partial results back to the model. The change is backwards compatible.',
    why_it_matters: 'A small quality-of-life improvement for people who already use the framework.',
    category: 'tools', tags: ['quay', 'agent frameworks'], impact: 24, fit: 62, coverage: 0, score: 39,
    score_reason: 'An incremental release; relevant to the reader’s tools interest but minor.',
    links: [link('releases', 'Quay releases', 'https://example.com/quay-2-4')],
  }),
  story(10, YESTERDAY, {
    title: 'Benchmark maintainers retire a saturated coding test',
    summary: 'The maintainers of a widely cited coding benchmark retired it after the top five models all scored above 96 percent, and announced a harder successor for January.',
    why_it_matters: 'Scores on the old test no longer separate models; expect comparisons to move to the successor.',
    category: 'research', tags: ['benchmarks'], impact: 55, fit: 70, coverage: 3, score: 64,
    score_reason: 'Notable for how models are compared, in the reader’s first interest.',
    links: [link('research', 'Lantern Evals', 'https://example.com/retired'), link('press-b', 'Circuit', 'https://example.com/circuit-retired')],
  }),
]

export const SAMPLE_DIGESTS: Digest[] = [
  {
    day: TODAY,
    headline: 'A new model family, and a clearer look inside one',
    overview: 'Northwind Labs released Atlas, its first new model generation in two years, with a context window of two million tokens. Separately, researchers traced how a deployed model plans ahead, the most complete account of its kind. The rest of the day was quieter: tools, an open-weights release and final regulatory guidance.',
    points: [
      { title: 'Atlas arrives', text: 'Three sizes, available today, and a 14-point jump on agentic coding. The largest reads two million tokens at once.', story_ids: [1] },
      { title: 'Planning, located', text: 'One circuit across forty layers carries multi-step planning; switching it off leaves single-step answers intact.', story_ids: [2] },
      { title: 'Agents keep getting longer leashes', text: 'Autonomous task length doubled in seven months, and Harbor now runs sessions in parallel and reviews its own diffs.', story_ids: [7, 3] },
      { title: 'Rules with a date', text: 'Final guidance fixes what providers of general-purpose models must document from next August.', story_ids: [5] },
    ],
    story_count: 9,
    item_count: 187,
    updated_at: '2026-11-22T04:41:00Z',
  },
  {
    day: YESTERDAY,
    headline: 'A quiet Saturday with one retired benchmark',
    overview: 'Little happened. The maintainers of a widely cited coding benchmark retired it as saturated and announced a successor.',
    points: [{ title: 'A benchmark runs out', text: 'The top five models all scored above 96 percent; a harder test follows in January.', story_ids: [10] }],
    story_count: 1,
    item_count: 64,
    updated_at: '2026-11-21T04:38:00Z',
  },
]

export const SAMPLE_REVIEW: Review = {
  week: '2026-W47',
  week_start: '2026-11-16',
  week_end: '2026-11-22',
  headline: 'A new generation lands while the tools to inspect it catch up',
  overview: 'The week ended with Atlas, the first new model family from Northwind Labs in two years. It began with slower news that matters as much: evaluators showed autonomous task length still doubling, and interpretability researchers located planning inside a deployed model. Together they describe a field where capability and the means to examine it are both moving, at different speeds.',
  themes: [
    { title: 'Capability took a step', text: 'Atlas raises the context window to two million tokens and Tern 4 brings near-frontier multilingual quality to a single graphics card. Both shift what can be built this month.', story_ids: [1, 6] },
    { title: 'Looking inside got more concrete', text: 'A planning circuit traced across forty layers and a first measurement of how accurately models report their own states give safety work something specific to test.', story_ids: [2, 4] },
    { title: 'Agents were measured, not just marketed', text: 'A doubling of task length in seven months is a trend line; a saturated benchmark was retired because it no longer separated models.', story_ids: [7, 10] },
  ],
  watch: 'Independent evaluations of Atlas are due within days, and competing labs have releases scheduled before the end of the month.',
  story_count: 10,
}

const sourceRow = (id: string, name: string, category: SourceStatus['category'], hoursAgo: number | null, failures = 0): SourceStatus => ({
  id, name, site_url: 'https://example.com', category, enabled: true, failures,
  last_ok_at: hoursAgo === null ? null : new Date(Date.parse('2026-11-22T04:31:00Z') - hoursAgo * 3_600_000).toISOString(),
})

export const SAMPLE_SOURCES: SourceStatus[] = [
  sourceRow('lab', 'Northwind Labs', 'lab', 0),
  sourceRow('tern', 'Tern Project', 'lab', 0),
  sourceRow('press-a', 'The Ledger', 'press', 0),
  sourceRow('press-b', 'Circuit', 'press', 72, 3),
  sourceRow('hn', 'Hacker News', 'community', 0),
  sourceRow('people', 'Field Notes', 'people', 0),
  sourceRow('research', 'Lantern Evals', 'research', 0),
  sourceRow('papers', 'Daily Papers', 'research', null, 1),
  sourceRow('releases', 'Quay releases', 'releases', 0),
]
