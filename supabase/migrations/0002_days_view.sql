-- The days that have stories, for the archive and for stepping from one day to
-- the next. A day appears as soon as it has a story, with its briefing's
-- headline once that is written. The view runs with the caller's rights, so the
-- policies on stories and digests apply.

create view public.days with (security_invoker = true) as
  select s.day, count(*)::integer as story_count, d.headline
  from public.stories s
  left join public.digests d on d.day = s.day
  group by s.day, d.headline;

grant select on public.days to anon, authenticated;
