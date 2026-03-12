create or replace function public.get_taxonomy_counts(
  p_kind text,
  p_published_only boolean default false
)
returns table (
  taxonomy_id uuid,
  article_count bigint
)
language plpgsql
stable
as $$
begin
  if p_kind = 'categories' then
    return query
    select
      a.category_id as taxonomy_id,
      count(*)::bigint as article_count
    from public.articles a
    where a.category_id is not null
      and (not p_published_only or a.is_published = true)
    group by a.category_id;
  elseif p_kind = 'tags' then
    if p_published_only then
      return query
      select
        at.tag_id as taxonomy_id,
        count(*)::bigint as article_count
      from public.article_tags at
      join public.articles a on a.id = at.article_id
      where a.is_published = true
      group by at.tag_id;
    else
      return query
      select
        at.tag_id as taxonomy_id,
        count(*)::bigint as article_count
      from public.article_tags at
      group by at.tag_id;
    end if;
  elseif p_kind = 'people' then
    if p_published_only then
      return query
      select
        ap.person_id as taxonomy_id,
        count(*)::bigint as article_count
      from public.article_people ap
      join public.articles a on a.id = ap.article_id
      where a.is_published = true
      group by ap.person_id;
    else
      return query
      select
        ap.person_id as taxonomy_id,
        count(*)::bigint as article_count
      from public.article_people ap
      group by ap.person_id;
    end if;
  else
    raise exception 'Unsupported taxonomy kind: %', p_kind;
  end if;
end;
$$;
