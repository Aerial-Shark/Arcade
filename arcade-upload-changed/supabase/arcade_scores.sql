-- Afterglow Arcade scoreboard.
-- Anyone may read scores and add one; nobody can edit or delete through the public API.

create table if not exists public.arcade_scores (
  id bigint generated always as identity primary key,
  game text not null check (game in ('perihelion', 'hexbloom', 'courier', 'coreguard', 'emberleap',
    'wordrush', 'echo', 'prism', 'trail', 'beatdrop', 'skystack', 'flashtap', 'crates', 'hockey')),
  name text not null check (char_length(name) between 1 and 16 and name ~ '^[[:alnum:] _.-]+$'),
  score integer not null check (score between 0 and 10000000),
  created_at timestamptz not null default now()
);

create index if not exists arcade_scores_game_score_idx on public.arcade_scores (game, score desc);

alter table public.arcade_scores enable row level security;

drop policy if exists "Anyone can read scores" on public.arcade_scores;
create policy "Anyone can read scores" on public.arcade_scores
  for select to anon, authenticated using (true);

drop policy if exists "Anyone can add a score" on public.arcade_scores;
create policy "Anyone can add a score" on public.arcade_scores
  for insert to anon, authenticated with check (true);

-- Light abuse protection: at most 60 new scores per minute across the site,
-- and one score per name per game every 10 seconds. The server sets the timestamp.
create or replace function public.arcade_scores_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.arcade_scores where created_at > now() - interval '1 minute') >= 60 then
    raise exception 'Too many scores right now' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.arcade_scores
    where game = new.game and name = new.name and created_at > now() - interval '10 seconds'
  ) then
    raise exception 'Slow down' using errcode = 'P0001';
  end if;
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists arcade_scores_guard on public.arcade_scores;
create trigger arcade_scores_guard
  before insert on public.arcade_scores
  for each row execute function public.arcade_scores_guard();
