-- Add multi-capability behavior controls to ai_personas.
-- Goal: one profile identity can serve editorial, counterpoint, and/or honey contexts.

alter table public.ai_personas
  add column if not exists editorial_enabled boolean not null default true,
  add column if not exists counterpoint_enabled boolean not null default true,
  add column if not exists honey_enabled boolean not null default false,
  add column if not exists list_publicly boolean not null default true,
  add column if not exists honey_delay_min_ms integer not null default 1000,
  add column if not exists honey_delay_max_ms integer not null default 10000,
  add column if not exists editorial_system_prompt_template text,
  add column if not exists editorial_response_style_template text,
  add column if not exists counterpoint_system_prompt_template text,
  add column if not exists counterpoint_response_style_template text,
  add column if not exists honey_system_prompt_template text,
  add column if not exists honey_response_style_template text;

-- Backfill capability prompt templates from legacy single-prompt fields.
update public.ai_personas
set
  editorial_system_prompt_template = coalesce(editorial_system_prompt_template, system_prompt_template),
  editorial_response_style_template = coalesce(editorial_response_style_template, response_style_template),
  counterpoint_system_prompt_template = coalesce(counterpoint_system_prompt_template, system_prompt_template),
  counterpoint_response_style_template = coalesce(counterpoint_response_style_template, response_style_template)
where true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_personas_honey_delay_min_chk'
  ) then
    alter table public.ai_personas
      add constraint ai_personas_honey_delay_min_chk
      check (honey_delay_min_ms >= 0);
  end if;
end$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ai_personas_honey_delay_range_chk'
  ) then
    alter table public.ai_personas
      add constraint ai_personas_honey_delay_range_chk
      check (
        honey_delay_max_ms >= honey_delay_min_ms
        and honey_delay_max_ms <= 60000
      );
  end if;
end$$;

comment on column public.ai_personas.editorial_enabled is 'Whether persona is eligible for editorial rewrite flows.';
comment on column public.ai_personas.counterpoint_enabled is 'Whether persona can react/reply in discussion counterpoint flows.';
comment on column public.ai_personas.honey_enabled is 'Whether persona can run honey-style engagement in DM/chat flows.';
comment on column public.ai_personas.list_publicly is 'Whether persona should appear in public AI persona listings.';
comment on column public.ai_personas.honey_delay_min_ms is 'Minimum randomized honey response delay in milliseconds.';
comment on column public.ai_personas.honey_delay_max_ms is 'Maximum randomized honey response delay in milliseconds.';
