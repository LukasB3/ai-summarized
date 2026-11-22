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

## What the site shows

Only a story's title, a summary written for this site, and links to the
sources. No article text and no images are copied.
