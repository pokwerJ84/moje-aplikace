-- Preserve a pronunciation recording when returning an instrument to vocabulary.
create or replace function public.dictionary_move_entry(p_source text,p_id text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  w public.dictionary_words%rowtype;
  m public.dictionary_manuals%rowtype;
  photos jsonb;
  cover jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if p_source='word' then
    select * into w from public.dictionary_words where id=p_id and owner_id=auth.uid() for update;
    if not found then raise exception 'Entry not found'; end if;
    photos=coalesce(w.manual_data->'photos','[]'::jsonb);
    if w.image_path is not null then
      select coalesce(jsonb_agg(p || jsonb_build_object('cover',p->>'path'=w.image_path)),'[]'::jsonb)
        into photos from jsonb_array_elements(photos) p;
      if not exists(select 1 from jsonb_array_elements(photos) p where p->>'path'=w.image_path) then
        photos=photos || jsonb_build_array(jsonb_build_object('id','cover-'||w.id,'path',w.image_path,'caption','','cover',true,'stepId',null));
      end if;
    end if;
    insert into public.dictionary_manuals(id,owner_id,kind,ja,en,model,description,steps,photos,word_data)
      values(w.id,auth.uid(),coalesce(w.manual_data->>'kind','instrument'),w.ja,case when w.en='' and w.ja='' then w.cs else w.en end,coalesce(w.manual_data->>'model',''),
        coalesce(w.manual_data->>'description',concat_ws(E'\n\n',nullif(w.description_en,''),case when w.description_ja<>'' then '日本語: '||w.description_ja end,case when w.description_cs<>'' then 'Česky: '||w.description_cs end)),
        coalesce(w.manual_data->'steps','[]'::jsonb),photos,
        to_jsonb(w)-'manual_data'-'owner_id'-'created_at'-'image_path') returning * into m;
    delete from public.dictionary_words where id=w.id and owner_id=auth.uid();
    return jsonb_build_object('kind','manual','entry',to_jsonb(m));
  elsif p_source='manual' then
    select * into m from public.dictionary_manuals where id=p_id and owner_id=auth.uid() for update;
    if not found then raise exception 'Entry not found'; end if;
    select p into cover from jsonb_array_elements(m.photos) with ordinality as items(p,n)
      order by coalesce((p->>'cover')::boolean,false) desc,(p->>'stepId' is null) desc,n limit 1;
    insert into public.dictionary_words(id,owner_id,ja,en,cs,description_ja,description_en,description_cs,image_path,manual_data,audio_path)
      values(m.id,auth.uid(),m.ja,case when m.en='' and m.ja='' then m.model else m.en end,
        coalesce(m.word_data->>'cs',''),coalesce(m.word_data->>'description_ja',''),
        coalesce(m.word_data->>'description_en',m.description),coalesce(m.word_data->>'description_cs',''),cover->>'path',
        to_jsonb(m)-'word_data'-'owner_id'-'created_at',nullif(m.word_data->>'audio_path','')) returning * into w;
    delete from public.dictionary_manuals where id=m.id and owner_id=auth.uid();
    return jsonb_build_object('kind','word','entry',to_jsonb(w));
  else raise exception 'Invalid source';
  end if;
end;
$$;
revoke all on function public.dictionary_move_entry(text,text) from public,anon;
grant execute on function public.dictionary_move_entry(text,text) to authenticated;
