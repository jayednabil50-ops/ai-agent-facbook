-- ============================================
-- Production schema bootstrap for dashboard
-- ============================================

create extension if not exists pgcrypto;
create extension if not exists vector;

-- --------------------------------------------
-- Core tables
-- --------------------------------------------

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  facebook_id text not null unique,
  contact_name text not null default 'Unknown',
  contact_avatar text,
  last_message text not null default '',
  last_message_time timestamptz not null default now(),
  unread_count integer not null default 0,
  is_archived boolean not null default false,
  ai_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  facebook_id text,
  contact_name text,
  content text not null default '',
  sender text not null check (sender in ('user', 'contact', 'ai')),
  attachment_url text,
  attachment_type text,
  is_carousel boolean not null default false,
  is_from_bot boolean not null default false,
  template_elements jsonb,
  message_type text not null default 'text',
  created_at timestamptz not null default now()
);

create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'Error',
  message text not null,
  context text,
  stack text,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text not null default '',
  review_date date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  role text not null default 'Viewer' check (role in ('Admin', 'Editor', 'Viewer')),
  avatar text,
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_date date not null default current_date,
  amount numeric(12,2) not null default 0,
  status text not null default 'Pending' check (status in ('Paid', 'Pending')),
  created_at timestamptz not null default now()
);

create table if not exists public.ai_settings (
  id uuid primary key default gen_random_uuid(),
  ai_name text not null default 'ShopBot AI',
  instructions text not null default '',
  ai_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.connected_pages (
  id uuid primary key default gen_random_uuid(),
  page_name text not null default 'Facebook Page',
  page_id text not null default '',
  webhook_url text not null default '',
  status text not null default 'disconnected' check (status in ('connected', 'disconnected')),
  connected_on timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default 'null'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_id text unique,
  order_date timestamptz not null default now(),
  customer_name text not null default 'Unknown',
  customer_phone text not null default '',
  address text,
  items jsonb not null default '[]'::jsonb,
  product_name text,
  quantity integer not null default 1,
  unit_price numeric(12,2) not null default 0,
  amount numeric(12,2) not null default 0,
  delivery_fee numeric(12,2),
  status text not null default 'Pending' check (status in ('Delivered', 'Confirmed', 'Pending', 'Cancelled')),
  product_link text,
  sku text,
  product_size text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- --------------------------------------------
-- Product + document vector search tables
-- --------------------------------------------

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category text,
  name text not null,
  price numeric(12,2),
  capacity text,
  burner_size text,
  height text,
  includes text,
  material text,
  fan_type text,
  image_url text,
  video_url text,
  embedding vector(1536),
  embedding_input_hash text,
  embed_status text not null default 'pending' check (embed_status in ('pending','processing','ready','error')),
  embed_error text,
  embedded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Knowledge Base',
  content text not null default '',
  embed_status text not null default 'pending' check (embed_status in ('pending','processing','ready','error')),
  embed_error text,
  embedded_at timestamptz,
  chunk_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  content_hash text,
  embedding vector(1536),
  token_count integer,
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

-- --------------------------------------------
-- Indexes
-- --------------------------------------------

create index if not exists idx_conversations_last_message_time on public.conversations (last_message_time desc);
create index if not exists idx_messages_conversation_created on public.messages (conversation_id, created_at);
create index if not exists idx_messages_created_at on public.messages (created_at);
create index if not exists idx_error_logs_created_at on public.error_logs (created_at desc);
create index if not exists idx_orders_order_date on public.orders (order_date desc);
create index if not exists products_embedding_ivfflat
  on public.products using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists document_chunks_embedding_ivfflat
  on public.document_chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists document_chunks_document_id_idx on public.document_chunks (document_id);

-- --------------------------------------------
-- Updated_at triggers
-- --------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_conversations_updated_at on public.conversations;
create trigger trg_conversations_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

drop trigger if exists trg_ai_settings_updated_at on public.ai_settings;
create trigger trg_ai_settings_updated_at
before update on public.ai_settings
for each row execute function public.set_updated_at();

drop trigger if exists trg_connected_pages_updated_at on public.connected_pages;
create trigger trg_connected_pages_updated_at
before update on public.connected_pages
for each row execute function public.set_updated_at();

drop trigger if exists trg_app_settings_updated_at on public.app_settings;
create trigger trg_app_settings_updated_at
before update on public.app_settings
for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists trg_documents_updated_at on public.documents;
create trigger trg_documents_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

-- --------------------------------------------
-- Embedding stale triggers
-- --------------------------------------------

create or replace function public.mark_product_embed_stale()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.embed_status := 'pending';
    new.embed_error := null;
    return new;
  end if;

  if (
    coalesce(new.name, '')        is distinct from coalesce(old.name, '') or
    coalesce(new.category, '')    is distinct from coalesce(old.category, '') or
    coalesce(new.includes, '')    is distinct from coalesce(old.includes, '') or
    coalesce(new.material, '')    is distinct from coalesce(old.material, '') or
    coalesce(new.capacity, '')    is distinct from coalesce(old.capacity, '') or
    coalesce(new.burner_size, '') is distinct from coalesce(old.burner_size, '') or
    coalesce(new.height, '')      is distinct from coalesce(old.height, '') or
    coalesce(new.fan_type, '')    is distinct from coalesce(old.fan_type, '')
  ) then
    new.embed_status := 'pending';
    new.embed_error := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_products_mark_embed_stale on public.products;
create trigger trg_products_mark_embed_stale
before insert or update on public.products
for each row execute function public.mark_product_embed_stale();

create or replace function public.mark_document_embed_stale()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.embed_status := 'pending';
    new.embed_error := null;
    return new;
  end if;

  if coalesce(new.content, '') is distinct from coalesce(old.content, '') then
    new.embed_status := 'pending';
    new.embed_error := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_documents_mark_embed_stale on public.documents;
create trigger trg_documents_mark_embed_stale
before insert or update on public.documents
for each row execute function public.mark_document_embed_stale();

-- --------------------------------------------
-- RAG RPCs
-- --------------------------------------------

create or replace function public.match_products(
  query_embedding vector(1536),
  match_count int default 5,
  similarity_threshold float default 0.5
)
returns table (
  id uuid, name text, category text, price numeric,
  capacity text, burner_size text, height text, includes text,
  material text, fan_type text, image_url text, video_url text,
  similarity float
)
language sql
stable
as $$
  select
    p.id, p.name, p.category, p.price, p.capacity, p.burner_size,
    p.height, p.includes, p.material, p.fan_type, p.image_url, p.video_url,
    1 - (p.embedding <=> query_embedding) as similarity
  from public.products p
  where p.embedding is not null
    and 1 - (p.embedding <=> query_embedding) >= similarity_threshold
  order by p.embedding <=> query_embedding
  limit match_count;
$$;

create or replace function public.match_document_chunks(
  query_embedding vector(1536),
  match_count int default 5,
  similarity_threshold float default 0.5
)
returns table (
  id uuid, document_id uuid, chunk_index int, content text, similarity float
)
language sql
stable
as $$
  select
    c.id, c.document_id, c.chunk_index, c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.document_chunks c
  where c.embedding is not null
    and 1 - (c.embedding <=> query_embedding) >= similarity_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function public.match_products(vector, int, float) to anon, authenticated;
grant execute on function public.match_document_chunks(vector, int, float) to anon, authenticated;

-- --------------------------------------------
-- RLS + policies (dashboard currently uses anon key)
-- --------------------------------------------

alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.error_logs enable row level security;
alter table public.reviews enable row level security;
alter table public.team_members enable row level security;
alter table public.invoices enable row level security;
alter table public.ai_settings enable row level security;
alter table public.connected_pages enable row level security;
alter table public.app_settings enable row level security;
alter table public.orders enable row level security;
alter table public.products enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;

drop policy if exists conversations_all on public.conversations;
create policy conversations_all on public.conversations for all to anon, authenticated using (true) with check (true);

drop policy if exists messages_all on public.messages;
create policy messages_all on public.messages for all to anon, authenticated using (true) with check (true);

drop policy if exists error_logs_all on public.error_logs;
create policy error_logs_all on public.error_logs for all to anon, authenticated using (true) with check (true);

drop policy if exists reviews_all on public.reviews;
create policy reviews_all on public.reviews for all to anon, authenticated using (true) with check (true);

drop policy if exists team_members_all on public.team_members;
create policy team_members_all on public.team_members for all to anon, authenticated using (true) with check (true);

drop policy if exists invoices_all on public.invoices;
create policy invoices_all on public.invoices for all to anon, authenticated using (true) with check (true);

drop policy if exists ai_settings_all on public.ai_settings;
create policy ai_settings_all on public.ai_settings for all to anon, authenticated using (true) with check (true);

drop policy if exists connected_pages_all on public.connected_pages;
create policy connected_pages_all on public.connected_pages for all to anon, authenticated using (true) with check (true);

drop policy if exists app_settings_all on public.app_settings;
create policy app_settings_all on public.app_settings for all to anon, authenticated using (true) with check (true);

drop policy if exists orders_all on public.orders;
create policy orders_all on public.orders for all to anon, authenticated using (true) with check (true);

drop policy if exists products_all on public.products;
create policy products_all on public.products for all to anon, authenticated using (true) with check (true);

drop policy if exists documents_all on public.documents;
create policy documents_all on public.documents for all to anon, authenticated using (true) with check (true);

drop policy if exists document_chunks_all on public.document_chunks;
create policy document_chunks_all on public.document_chunks for all to anon, authenticated using (true) with check (true);

-- --------------------------------------------
-- Realtime publication
-- --------------------------------------------

do $$
begin
  begin
    alter publication supabase_realtime add table public.conversations;
  exception when duplicate_object then
    null;
  end;

  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then
    null;
  end;

  begin
    alter publication supabase_realtime add table public.orders;
  exception when duplicate_object then
    null;
  end;
end;
$$;

-- --------------------------------------------
-- Storage buckets + policies
-- --------------------------------------------

insert into storage.buckets (id, name, public)
values
  ('voice-messages', 'voice-messages', true),
  ('customer-images', 'customer-images', true),
  ('customer-files', 'customer-files', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists storage_public_read on storage.objects;
create policy storage_public_read
on storage.objects for select
to anon, authenticated
using (bucket_id in ('voice-messages', 'customer-images', 'customer-files'));

drop policy if exists storage_public_insert on storage.objects;
create policy storage_public_insert
on storage.objects for insert
to anon, authenticated
with check (bucket_id in ('voice-messages', 'customer-images', 'customer-files'));

drop policy if exists storage_public_update on storage.objects;
create policy storage_public_update
on storage.objects for update
to anon, authenticated
using (bucket_id in ('voice-messages', 'customer-images', 'customer-files'))
with check (bucket_id in ('voice-messages', 'customer-images', 'customer-files'));

drop policy if exists storage_public_delete on storage.objects;
create policy storage_public_delete
on storage.objects for delete
to anon, authenticated
using (bucket_id in ('voice-messages', 'customer-images', 'customer-files'));

-- --------------------------------------------
-- Defaults / seed rows
-- --------------------------------------------

insert into public.ai_settings (id, ai_name, instructions, ai_active)
values ('00000000-0000-0000-0000-000000000001', 'ShopBot AI', '', true)
on conflict (id) do nothing;

insert into public.connected_pages (id, page_name, page_id, webhook_url, status)
values ('00000000-0000-0000-0000-000000000001', 'Facebook Page', '', '', 'disconnected')
on conflict (id) do nothing;

insert into public.app_settings (key, value)
values
  ('profile', '{"name":"","email":"","phone":""}'::jsonb),
  ('notifications', '{"emailAlerts":true,"errorAlerts":true,"dailySummary":false}'::jsonb),
  ('webhook', '{"messageWebhook":"","errorWebhook":""}'::jsonb),
  ('n8n_webhook_url', '""'::jsonb),
  ('openai_base_url', '"https://api.openai.com/v1"'::jsonb)
on conflict (key) do nothing;
