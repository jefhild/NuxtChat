with article_people_source as (
  select
    a.id as article_id,
    trim(
      both '-'
      from regexp_replace(lower(trim(person_name)), '[^a-z0-9]+', '-', 'g')
    ) as person_slug
  from public.articles a
  cross join lateral jsonb_array_elements_text(
    case
      when jsonb_typeof(a.newsmesh_meta -> 'people') = 'array'
        then a.newsmesh_meta -> 'people'
      else '[]'::jsonb
    end
  ) as person_name
)
insert into public.article_people (article_id, person_id)
select distinct
  source.article_id,
  p.id
from article_people_source source
join public.people p
  on p.slug = source.person_slug
where source.person_slug <> ''
on conflict (article_id, person_id) do nothing;
