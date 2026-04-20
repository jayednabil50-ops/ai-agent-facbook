-- Embedding production hardening:
-- 1) Hash-based idempotency for product embedding input
-- 2) Chunk hash tracking for incremental document re-embedding

create extension if not exists pgcrypto;

alter table public.products
  add column if not exists embedding_input_hash text;

alter table public.document_chunks
  add column if not exists content_hash text;

update public.document_chunks
set content_hash = encode(extensions.digest(content, 'sha256'), 'hex')
where content_hash is null and content is not null;

create index if not exists idx_products_embedding_input_hash
  on public.products (embedding_input_hash);

create index if not exists idx_document_chunks_document_hash
  on public.document_chunks (document_id, content_hash);
