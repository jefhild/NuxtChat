create table if not exists public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists profile_photos_user_id_idx on public.profile_photos (user_id);
create index if not exists profile_photos_status_idx on public.profile_photos (status);

alter table public.profile_photos
  add constraint profile_photos_status_check check (status in ('pending', 'approved', 'rejected'));
