-- Add structured descriptive fields to ai_personas for UI display and filtering
alter table public.ai_personas
  add column if not exists bias text,
  add column if not exists angle text,
  add column if not exists region text,
  add column if not exists language_code text;

comment on column public.ai_personas.bias is 'Short descriptor of stance or bias for display and filtering.';
comment on column public.ai_personas.angle is 'One-line summary/angle of the persona voice.';
comment on column public.ai_personas.region is 'Geographic/market region label (e.g., US, EU, US/EU).';
comment on column public.ai_personas.language_code is 'IETF language tag for the persona''s primary language (e.g., en-US).';
