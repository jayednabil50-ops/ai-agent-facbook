# RAG Setup (Products + Documents)

RAG schema + embedding tables are included in:

- `supabase/migrations/20260418_init_production_schema.sql`
- `supabase/migrations/202604180001_fix_api_grants.sql`
- `supabase/migrations/202604180002_embedding_hardening.sql`
- `supabase/migrations/202604180003_n8n_vectorstore_compat.sql`

## Edge functions

- `embed-product`: product embedding with input-hash dedupe (skips unchanged)
- `embed-document`: chunk-based embedding with incremental re-embed (only changed chunks)
- `search-rag`: exact + vector hybrid retrieval with context budget controls

## Chunk-cost behavior (production)

- Documents are chunked before embedding.
- On document update, unchanged chunks are NOT re-embedded.
- Only changed chunk indexes are sent for embedding API calls.
- Retrieval context is capped (`max_context_chars`, `max_chunk_chars`) to reduce downstream token cost.

## `search-rag` request example (recommended)

```json
{
  "query": "Do you have AZ-00 stove?",
  "query_embedding": [0.0123, -0.0456, "..."],
  "target": "product",
  "k_products": 5,
  "k_chunks": 3,
  "threshold": 0.3,
  "strict_product_match": true,
  "skip_vector_when_exact": true,
  "max_context_chars": 3000,
  "max_chunk_chars": 420
}
```

Notes:
- `query_embedding` is optional.
- If `query_embedding` is provided, `search-rag` uses it directly (best for n8n-managed OpenAI usage).
- If `query_embedding` is not provided, `search-rag` will try to create embedding from Supabase-side OpenAI config.

## n8n usage guidance

1. Product question: call `search-rag` with `target: "product"`.
2. Policy/document question: call `search-rag` with `target: "doc"`.
3. Keep `strict_product_match: true` to avoid broad product retrieval.
4. Use `context` response field as LLM context, not full table dumps.
5. Run `embed-product` / `embed-document` background jobs after data updates.
6. If OpenAI is only in n8n, pass `query_embedding` in `search-rag` body.

## n8n Supabase Vector Store compatibility

If you use n8n `vectorStoreSupabase` directly, n8n expects RPC signatures like:

- `match_documents(query_embedding, match_count, filter)`
- `match_products(query_embedding, match_count, filter)`

The migration `202604180003_n8n_vectorstore_compat.sql` adds these compatible overloads
and returns LangChain-compatible columns (`id`, `content`, `metadata`, `similarity`).

### Required n8n node settings

- Product tool:
  - `tableName = products`
  - `options.queryName = match_products`
- Docs tool:
  - `tableName = document_chunks`
  - `options.queryName = match_documents`
- Connect both tools to AI Agent via `ai_tool`.
- Connect one Embeddings node to both tools via `ai_embedding`.

Ready-to-import sample workflow:

- `n8n/ready-import-rag-agent-tools.json`
