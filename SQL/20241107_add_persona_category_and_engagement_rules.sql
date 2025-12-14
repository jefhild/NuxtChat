-- Link AI personas to categories and store engagement rule presets
alter table public.ai_personas
  add column if not exists category_id uuid references public.categories (id) on delete set null;

create table if not exists public.ai_engagement_rules (
  id uuid primary key default gen_random_uuid(),
  context text not null,
  name text not null,
  description text,
  rules jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_ai_engagement_rules_context on public.ai_engagement_rules (context);
create index if not exists idx_ai_engagement_rules_is_default on public.ai_engagement_rules (context, is_default);

-- Ensure only one default per context
create unique index if not exists ai_engagement_rules_default_ctx_uniq
  on public.ai_engagement_rules (context)
  where is_default = true;

comment on table public.ai_engagement_rules is 'Rule presets for bot engagement in discussions vs 1:1 chat.';
comment on column public.ai_engagement_rules.rules is 'JSONB payload for cadence, moderation, and reply style.';

-- Keep updated_at current
create or replace function public.set_ai_engagement_rules_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_ai_engagement_rules_updated_at on public.ai_engagement_rules;
create trigger trg_ai_engagement_rules_updated_at
  before update on public.ai_engagement_rules
  for each row execute function public.set_ai_engagement_rules_updated_at();
