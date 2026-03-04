-- Metadata table for avatar decoration assets stored in Supabase Storage.
-- This keeps human-friendly labels separate from storage filenames.

create table if not exists public.avatar_decorations (
  id uuid primary key default gen_random_uuid(),
  storage_name text not null unique,
  display_name text not null,
  is_active boolean not null default true,
  created_by uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_avatar_decorations_storage_name
  on public.avatar_decorations (storage_name);

create index if not exists idx_avatar_decorations_active
  on public.avatar_decorations (is_active);
