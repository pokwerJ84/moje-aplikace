alter table public.dictionary_manuals add column sort_order bigint;

-- Reorder only the caller's existing cards, atomically; never rewrite guide content.
create function public.dictionary_reorder_manuals(p_ids text[])
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if p_ids is null
    or cardinality(p_ids) <> (select count(*) from public.dictionary_manuals where owner_id=auth.uid())
    or cardinality(p_ids) <> (select count(distinct id) from unnest(p_ids) as ids(id))
    or exists(select 1 from unnest(p_ids) as ids(id) where not exists(
      select 1 from public.dictionary_manuals m where m.id=ids.id and m.owner_id=auth.uid()
    )) then raise exception 'Card list changed. Reload before arranging.'; end if;
  update public.dictionary_manuals m set sort_order=ids.position-1
    from unnest(p_ids) with ordinality as ids(id,position)
    where m.id=ids.id and m.owner_id=auth.uid();
end;
$$;
revoke all on function public.dictionary_reorder_manuals(text[]) from public,anon;
grant execute on function public.dictionary_reorder_manuals(text[]) to authenticated;
