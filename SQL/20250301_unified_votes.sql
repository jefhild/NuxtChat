-- Unified, polymorphic voting table for all target types.
create table if not exists public.vote_target_types (
  type text primary key,
  description text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.votes_unified (
  id bigserial primary key,
  user_id uuid not null,
  target_type text not null,
  target_id uuid not null,
  value smallint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint votes_unified_user_fkey foreign key (user_id)
    references auth.users (id) on delete cascade,
  constraint votes_unified_value_chk check (value in (-1, 1))
);

create unique index if not exists votes_unified_unique_per_target
  on public.votes_unified (user_id, target_type, target_id);

create index if not exists votes_unified_by_target
  on public.votes_unified (target_type, target_id);

create index if not exists votes_unified_by_user
  on public.votes_unified (user_id);

drop trigger if exists trg_votes_unified_updated_at on public.votes_unified;
create trigger trg_votes_unified_updated_at
  before update on public.votes_unified
  for each row execute function set_updated_at();

-- Known defaults (optional catalog; not enforced).
insert into public.vote_target_types (type, description)
values
  ('message', 'Votes on messages'),
  ('thread', 'Votes on threads'),
  ('article', 'Votes on articles')
on conflict (type) do nothing;

-- Backfill from legacy tables if they exist.
do $$
begin
  if to_regclass('public.votes_messages') is not null then
    insert into public.votes_unified (user_id, target_type, target_id, value, created_at, updated_at)
    select vm.user_id, 'message', vm.message_id, vm.value, vm.created_at, vm.updated_at
    from public.votes_messages vm
    on conflict (user_id, target_type, target_id) do nothing;
  end if;

  if to_regclass('public.votes_threads') is not null then
    insert into public.votes_unified (user_id, target_type, target_id, value, created_at, updated_at)
    select vt.user_id, 'thread', vt.thread_id, vt.value, vt.created_at, vt.updated_at
    from public.votes_threads vt
    on conflict (user_id, target_type, target_id) do nothing;
  end if;
end $$;

-- Aggregates (read-time).
drop view if exists public.message_scores_today;
drop view if exists public.thread_scores_today;
drop view if exists public.message_scores_30d;
drop view if exists public.thread_scores_30d;

create or replace view public.message_scores as
select
  v.target_id as message_id,
  coalesce(sum(v.value), 0) as score,
  count(*) filter (where v.value = 1) as upvotes,
  count(*) filter (where v.value = -1) as downvotes
from public.votes_unified v
where v.target_type = 'message'
group by v.target_id;


create or replace view public.thread_scores as
select
  v.target_id as thread_id,
  coalesce(sum(v.value), 0) as score,
  count(*) filter (where v.value = 1) as upvotes,
  count(*) filter (where v.value = -1) as downvotes
from public.votes_unified v
where v.target_type = 'thread'
group by v.target_id;

create or replace view public.article_scores as
select
  v.target_id as article_id,
  coalesce(sum(v.value), 0) as score,
  count(*) filter (where v.value = 1) as upvotes,
  count(*) filter (where v.value = -1) as downvotes
from public.votes_unified v
where v.target_type = 'article'
group by v.target_id;
