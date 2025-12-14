-- Track per-thread persona reply caps and cadence enforcement
create table if not exists public.thread_persona_stats (
  thread_id uuid not null references public.threads (id) on delete cascade,
  persona_id uuid not null references public.ai_personas (id) on delete cascade,
  reply_count integer not null default 0,
  last_reply_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint thread_persona_stats_uniq unique (thread_id, persona_id)
);

create index if not exists idx_thread_persona_stats_thread on public.thread_persona_stats (thread_id);
create index if not exists idx_thread_persona_stats_persona on public.thread_persona_stats (persona_id);

create or replace function public.set_thread_persona_stats_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_thread_persona_stats_updated_at on public.thread_persona_stats;
create trigger trg_thread_persona_stats_updated_at
  before update on public.thread_persona_stats
  for each row execute function public.set_thread_persona_stats_updated_at();
