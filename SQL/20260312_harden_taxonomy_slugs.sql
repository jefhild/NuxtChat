with normalized_categories as (
  select
    id,
    trim(both '-' from regexp_replace(lower(trim(coalesce(slug, name, ''))), '[^a-z0-9]+', '-', 'g')) as next_slug
  from public.categories
),
normalized_tags as (
  select
    id,
    trim(both '-' from regexp_replace(lower(trim(coalesce(slug, name, ''))), '[^a-z0-9]+', '-', 'g')) as next_slug
  from public.tags
),
normalized_people as (
  select
    id,
    trim(both '-' from regexp_replace(lower(trim(coalesce(slug, name, ''))), '[^a-z0-9]+', '-', 'g')) as next_slug
  from public.people
)
update public.categories c
set slug = n.next_slug
from normalized_categories n
where c.id = n.id
  and n.next_slug <> ''
  and c.slug is distinct from n.next_slug
  and not exists (
    select 1
    from public.categories other
    where other.id <> c.id
      and other.slug = n.next_slug
  );

with normalized_tags as (
  select
    id,
    trim(both '-' from regexp_replace(lower(trim(coalesce(slug, name, ''))), '[^a-z0-9]+', '-', 'g')) as next_slug
  from public.tags
)
update public.tags t
set slug = n.next_slug
from normalized_tags n
where t.id = n.id
  and n.next_slug <> ''
  and t.slug is distinct from n.next_slug
  and not exists (
    select 1
    from public.tags other
    where other.id <> t.id
      and other.slug = n.next_slug
  );

with normalized_people as (
  select
    id,
    trim(both '-' from regexp_replace(lower(trim(coalesce(slug, name, ''))), '[^a-z0-9]+', '-', 'g')) as next_slug
  from public.people
)
update public.people p
set slug = n.next_slug
from normalized_people n
where p.id = n.id
  and n.next_slug <> ''
  and p.slug is distinct from n.next_slug
  and not exists (
    select 1
    from public.people other
    where other.id <> p.id
      and other.slug = n.next_slug
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'categories_slug_format_check'
  ) then
    alter table public.categories
      add constraint categories_slug_format_check
      check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'tags_slug_format_check'
  ) then
    alter table public.tags
      add constraint tags_slug_format_check
      check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'people_slug_format_check'
  ) then
    alter table public.people
      add constraint people_slug_format_check
      check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
      not valid;
  end if;
end $$;
