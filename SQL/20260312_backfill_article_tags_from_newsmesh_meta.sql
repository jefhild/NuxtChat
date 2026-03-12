with article_tag_source as (
  select
    a.id as article_id,
    trim(
      both '-'
      from regexp_replace(lower(trim(topic_name)), '[^a-z0-9]+', '-', 'g')
    ) as tag_slug
  from public.articles a
  cross join lateral jsonb_array_elements_text(
    case
      when jsonb_typeof(a.newsmesh_meta -> 'topics') = 'array'
        then a.newsmesh_meta -> 'topics'
      else '[]'::jsonb
    end
  ) as topic_name
)
insert into public.article_tags (article_id, tag_id)
select distinct
  source.article_id,
  t.id
from article_tag_source source
join public.tags t
  on t.slug = source.tag_slug
where source.tag_slug <> ''
on conflict (article_id, tag_id) do nothing;
