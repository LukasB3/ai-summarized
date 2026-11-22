# ai-summarized

A daily digest of AI news at [ai-summarized.lukasbossert.com](https://ai-summarized.lukasbossert.com).

Every morning a job collects new entries from about thirty feeds and APIs
(labs, press, community, research), merges reports about the same event into
one story, and has Claude summarise and score each story. The site shows a
briefing of the day, the stories ranked by relevance, an archive, a weekly
review and a search.

## How a story is ranked

Each story gets two scores from 0 to 100, both judged against a fixed scale:

- **Impact**: how much it changes the field on its own.
- **Fit**: how well it matches the interest profile in `worker/profile.md`.

The final score is `0.6 × impact + 0.4 × fit`, plus up to 10 points for
coverage by several independent outlets. Stories with an impact of 85 or more
are marked as major and always shown first.

## Layout

| Folder | What it is |
|---|---|
| `worker/` | The daily and weekly job: Node 22, TypeScript, Anthropic SDK |
| `web/` | The site: Next.js on Vercel |
| `supabase/migrations/` | Database schema (Postgres on Supabase) |
| `infra/` | Server setup, deploy script, systemd units |

## The daily run

`worker/src/daily.ts`, every morning at 06:55 Europe/Berlin:

1. **Collect** every source in `worker/src/sources.ts`. A source that fails is recorded and skipped.
2. **Triage** each new entry with a small model: AI news or not, and roughly how relevant.
3. **Cluster** the entries that passed: reports about the same event become one story, and a report that only repeats a published story joins it.
4. **Summarise and score** each new story with a stronger model, from the reports and the text of the main article.
5. **Rank** with the formula above.
6. **Brief**: one text about the day, written from the stored stories.

A run stops asking the model when it has spent its budget (`RUN_BUDGET_USD`, 2 dollars by default) and records that. It can be started again on the same day without writing anything twice. On Sunday evening a second job writes the weekly review.

Text from feeds and articles is untrusted input: the model gets no tools, answers in a fixed schema, and the worker refuses to fetch addresses inside private networks.

## Commands

```bash
cd worker
npm ci
npm test                      # unit tests and whole runs against fakes
npm run typecheck
npx tsx src/main.ts collect   # read all sources and print what they hold; no database, no model, no cost
```

On the server (`infra/provision.sh` once, then `infra/deploy.sh <ref>`):

```bash
systemctl start ai-summarized-digest     # run now
journalctl -u ai-summarized-digest -n 50  # what the last run did
```

The two secrets (`ANTHROPIC_API_KEY`, `SUPABASE_SECRET_KEY`) are stored on the server with `ai-summarized-secret <NAME>`, which asks for the value without showing it.

## The site

`web/` is a Next.js app on Vercel. It only reads: pages are rendered on the server from Supabase with the publishable key and rebuilt at most every five minutes. The browser talks to nobody but the site itself: no cookies, no analytics, fonts served from here.

A headline's weight follows its impact score, so a day reads from heavy to light. The category filter works without script.

```bash
cd web
npm ci
npm run dev     # without SUPABASE_URL it shows built-in sample data
npm test
npm run typecheck
```

## What the site shows

Only a story's title, a summary written for this site, and links to the
sources. No article text and no images are copied.
