-- Normalize uniqueness on (thread_id, user_id) and (thread_id, persona_id)
-- Drop old constraints/indexes (constraints and indexes can share names)
drop index if exists thread_participants_human_uniq;
drop index if exists thread_participants_persona_uniq;

alter table if exists public.thread_participants
  drop constraint if exists thread_participants_human_uniq,
  drop constraint if exists thread_participants_persona_uniq;

-- Re-add constraints (will create backing indexes with the same names)
alter table public.thread_participants
  add constraint thread_participants_human_uniq unique (thread_id, user_id);

alter table public.thread_participants
  add constraint thread_participants_persona_uniq unique (thread_id, persona_id);
