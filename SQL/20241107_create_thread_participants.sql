-- Create table to track enrolled participants (humans and personas) per thread
create table if not exists public.thread_participants (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads (id) on delete cascade,
  user_id uuid references public.profiles (user_id) on delete cascade,
  persona_id uuid references public.ai_personas (id) on delete cascade,
  kind text not null check (kind in ('human', 'persona')),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz,
  constraint thread_participants_human_uniq unique (thread_id, user_id),
  constraint thread_participants_persona_uniq unique (thread_id, persona_id)
);

create index if not exists idx_thread_participants_thread on public.thread_participants (thread_id);

comment on table public.thread_participants is 'Participants enrolled in a discussion thread (humans and category personas).';
