-- n8n Supabase Vector Store compatibility layer.
--
-- n8n vectorStoreSupabase calls RPCs with this signature:
--   (query_embedding vector, match_count int, filter jsonb)
-- and expects rows in LangChain document shape:
--   id, content, metadata, similarity
--
-- Existing app RPCs use (query_embedding, match_count, similarity_threshold),
-- so we add overloaded JSONB-filter variants without breaking existing callers.

create or replace function public.match_documents(
  query_embedding vector(1536),
  match_count int default 5,
  filter jsonb default '{}'::jsonb
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql
stable
as $$
  with ranked as (
    select
      c.id,
      c.content,
      jsonb_strip_nulls(
        jsonb_build_object(
          'source', 'document',
          'document_id', c.document_id,
          'chunk_index', c.chunk_index,
          'title', d.title
        )
      ) as metadata,
      1 - (c.embedding <=> query_embedding) as similarity
    from public.document_chunks c
    left join public.documents d on d.id = c.document_id
    where c.embedding is not null
  )
  select
    r.id,
    r.content,
    r.metadata,
    r.similarity
  from ranked r
  where coalesce(filter, '{}'::jsonb) = '{}'::jsonb
     or r.metadata @> coalesce(filter, '{}'::jsonb)
  order by r.similarity desc
  limit greatest(coalesce(match_count, 5), 1);
$$;

create or replace function public.match_document_chunks(
  query_embedding vector(1536),
  match_count int default 5,
  filter jsonb default '{}'::jsonb
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql
stable
as $$
  with ranked as (
    select
      c.id,
      c.content,
      jsonb_strip_nulls(
        jsonb_build_object(
          'source', 'document',
          'document_id', c.document_id,
          'chunk_index', c.chunk_index,
          'title', d.title
        )
      ) as metadata,
      1 - (c.embedding <=> query_embedding) as similarity
    from public.document_chunks c
    left join public.documents d on d.id = c.document_id
    where c.embedding is not null
  )
  select
    r.id,
    r.content,
    r.metadata,
    r.similarity
  from ranked r
  where coalesce(filter, '{}'::jsonb) = '{}'::jsonb
     or r.metadata @> coalesce(filter, '{}'::jsonb)
  order by r.similarity desc
  limit greatest(coalesce(match_count, 5), 1);
$$;

create or replace function public.match_products(
  query_embedding vector(1536),
  match_count int default 5,
  filter jsonb default '{}'::jsonb
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language sql
stable
as $$
  with ranked as (
    select
      p.id,
      trim(
        concat_ws(
          E'\n',
          concat('Name: ', coalesce(p.name, '')),
          case when p.category is not null then concat('Category: ', p.category) end,
          case when p.price is not null then concat('Price: ', p.price) end,
          case when p.capacity is not null then concat('Capacity: ', p.capacity) end,
          case when p.burner_size is not null then concat('Burner size: ', p.burner_size) end,
          case when p.height is not null then concat('Height: ', p.height) end,
          case when p.material is not null then concat('Material: ', p.material) end,
          case when p.fan_type is not null then concat('Fan type: ', p.fan_type) end,
          case when p.includes is not null then concat('Includes: ', p.includes) end
        )
      ) as content,
      jsonb_strip_nulls(
        jsonb_build_object(
          'source', 'product',
          'product_id', p.id,
          'name', p.name,
          'category', p.category,
          'price', p.price,
          'capacity', p.capacity,
          'burner_size', p.burner_size,
          'height', p.height,
          'includes', p.includes,
          'material', p.material,
          'fan_type', p.fan_type,
          'image_url', p.image_url,
          'video_url', p.video_url
        )
      ) as metadata,
      1 - (p.embedding <=> query_embedding) as similarity
    from public.products p
    where p.embedding is not null
  )
  select
    r.id,
    r.content,
    r.metadata,
    r.similarity
  from ranked r
  where coalesce(filter, '{}'::jsonb) = '{}'::jsonb
     or r.metadata @> coalesce(filter, '{}'::jsonb)
  order by r.similarity desc
  limit greatest(coalesce(match_count, 5), 1);
$$;

grant execute on function public.match_documents(vector, int, jsonb) to anon, authenticated;
grant execute on function public.match_document_chunks(vector, int, jsonb) to anon, authenticated;
grant execute on function public.match_products(vector, int, jsonb) to anon, authenticated;
