create table if not exists public.mood_feed_settings (
  id int primary key default 1,
  default_tone text not null default 'funny',
  updated_at timestamptz not null default now()
);

insert into public.mood_feed_settings (id, default_tone)
values (1, 'funny')
on conflict (id) do nothing;
