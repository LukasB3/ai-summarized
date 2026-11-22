-- ai-summarized: schema.
-- The worker writes with a secret key (role service_role, bypasses RLS).
-- The website reads with the publishable key (role anon): stories, digests,
-- reviews and a few columns of sources. Nothing else is readable from outside.

create table public.sources (
  id            text primary key,
  name          text not null,
  kind          text not null check (kind in ('feed', 'hn', 'hf_papers', 'anthropic_news')),
  url           text not null,
  site_url      text not null,
  category      text not null check (category in ('lab', 'press', 'community', 'people', 'research', 'releases')),
  weight        real not null default 1,
  enabled       boolean not null default true,
  last_ok_at    timestamptz,
  last_error    text,
  last_error_at timestamptz,
  failures      integer not null default 0,
  created_at    timestamptz not null default now()
);

create table public.stories (
  id             bigint generated always as identity primary key,
  day            date not null,
  title          text not null,
  summary        text not null,
  why_it_matters text not null,
  category       text not null check (category in ('models', 'tools', 'research', 'safety', 'business', 'policy', 'other')),
  tags           text[] not null default '{}',
  impact         smallint not null check (impact between 0 and 100),
  fit            smallint not null check (fit between 0 and 100),
  coverage       smallint not null default 0 check (coverage between 0 and 10),
  score          smallint not null check (score between 0 and 100),
  score_reason   text not null,
  major          boolean generated always as (impact >= 85) stored,
  links          jsonb not null default '[]',
  source_count   smallint not null default 1,
  primary_url    text not null,
  model          text not null,
  first_seen_at  timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- array_to_string is only "stable" in Postgres because of its generic element
-- type; for text[] the result never changes, which a generated column needs.
create function public.tags_text(tags text[]) returns text
  language sql immutable parallel safe
  set search_path = ''
  return array_to_string(tags, ' ');

alter table public.stories add column search tsvector generated always as (
  setweight(to_tsvector('english', title), 'A') ||
  setweight(to_tsvector('english', public.tags_text(tags)), 'B') ||
  setweight(to_tsvector('english', summary || ' ' || why_it_matters), 'C')
) stored;

create index stories_day_score on public.stories (day desc, score desc);
create index stories_search on public.stories using gin (search);

create table public.items (
  id                 bigint generated always as identity primary key,
  source_id          text not null references public.sources (id),
  url                text not null,
  title              text not null,
  excerpt            text,
  published_at       timestamptz,
  fetched_at         timestamptz not null default now(),
  points             integer,
  discussion_url     text,
  is_ai_news         boolean,
  triage_category    text,
  triage_score       smallint,
  triage_reason      text,
  triaged_at         timestamptz,
  story_id           bigint references public.stories (id) on delete set null,
  article_text       text,
  article_fetched_at timestamptz,
  unique (source_id, url)
);

create index items_url on public.items (url);
create index items_story on public.items (story_id);
create index items_untriaged on public.items (fetched_at) where triaged_at is null;
create index items_unassigned on public.items (fetched_at) where story_id is null and triaged_at is not null;

create table public.digests (
  day          date primary key,
  headline     text not null,
  overview     text not null,
  points       jsonb not null default '[]',
  story_count  integer not null,
  item_count   integer not null,
  model        text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.reviews (
  week        text primary key check (week ~ '^\d{4}-W\d{2}$'),
  week_start  date not null,
  week_end    date not null,
  headline    text not null,
  overview    text not null,
  themes      jsonb not null default '[]',
  watch       text not null,
  story_count integer not null,
  model       text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.runs (
  id            bigint generated always as identity primary key,
  kind          text not null check (kind in ('daily', 'weekly')),
  day           date not null,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  status        text not null default 'running' check (status in ('running', 'ok', 'capped', 'failed')),
  stats         jsonb not null default '{}',
  input_tokens  bigint not null default 0,
  output_tokens bigint not null default 0,
  cost_usd      numeric(10, 4) not null default 0,
  error         text
);

create index runs_started on public.runs (started_at desc);

-- Access. Supabase grants everything on new public tables to anon and
-- authenticated; take that back and hand out only what the website reads.
alter table public.sources enable row level security;
alter table public.stories enable row level security;
alter table public.items   enable row level security;
alter table public.digests enable row level security;
alter table public.reviews enable row level security;
alter table public.runs    enable row level security;

revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;

grant select on public.stories, public.digests, public.reviews to anon, authenticated;
grant select (id, name, site_url, category, enabled, last_ok_at, failures)
  on public.sources to anon, authenticated;

create policy "stories are public" on public.stories for select to anon, authenticated using (true);
create policy "digests are public" on public.digests for select to anon, authenticated using (true);
create policy "reviews are public" on public.reviews for select to anon, authenticated using (true);
create policy "sources are public" on public.sources for select to anon, authenticated using (true);

-- Items (with fetched article text) and runs (with cost) stay private: RLS is
-- on, there is no policy and no grant.
create policy "items are private" on public.items for all to anon, authenticated using (false);
create policy "runs are private"  on public.runs  for all to anon, authenticated using (false);

-- Full-text search for the website. Runs with the caller's rights, so the
-- policies above apply.
create function public.search_stories(q text, max_results integer default 30, skip integer default 0)
returns table (
  id bigint, day date, title text, summary text, why_it_matters text, category text,
  tags text[], impact smallint, fit smallint, coverage smallint, score smallint,
  score_reason text, major boolean, links jsonb, source_count smallint, rank real
)
language sql stable
set search_path = ''
as $$
  select s.id, s.day, s.title, s.summary, s.why_it_matters, s.category,
         s.tags, s.impact, s.fit, s.coverage, s.score,
         s.score_reason, s.major, s.links, s.source_count,
         ts_rank(s.search, query) as rank
  from public.stories s, websearch_to_tsquery('english', q) as query
  where s.search @@ query
  order by rank desc, s.day desc, s.score desc
  limit least(greatest(max_results, 1), 50)
  offset greatest(skip, 0)
$$;

revoke all on function public.search_stories(text, integer, integer) from public;
grant execute on function public.search_stories(text, integer, integer) to anon, authenticated, service_role;
-- Only runs when a story is written, which only the worker does.
revoke all on function public.tags_text(text[]) from public, anon, authenticated;
grant execute on function public.tags_text(text[]) to service_role;
