# n8n Production Audit (Client Migration Ready)

This file maps your current n8n JSON to the production Supabase integration.

## Target project

- Supabase project ref: `knfixatinuivgirybnew`
- Functions base URL: `https://knfixatinuivgirybnew.supabase.co/functions/v1`

## Current risks in your n8n JSON

1. Hardcoded Graph API access token in multiple nodes (`Typing Bubble1`, `send massege`, `Mark Seen`, profile lookup nodes).
2. Hardcoded old Supabase REST URLs and anon keys.
3. Mixed project references (older refs) in the same flow.
4. Product retrieval still routed through Google Sheets tool (`get_products`) which causes broad retrieval and higher token usage.
5. Webhook verify token hardcoded in `If18`.

## Production replacement map

1. Replace direct Facebook send HTTP nodes with one Supabase function call:
   - `POST /functions/v1/facebook-send`
   - actions: `send_text`, `send_image`, `send_audio`, `send_file`

2. Replace direct Supabase REST `insert/upsert` nodes with function-level endpoints:
   - inbound sync: `POST /functions/v1/incoming-message`
   - errors: `POST /functions/v1/log-error`

3. Replace product/doc retrieval node:
   - old: `get_products` Google Sheets Tool
   - new: `POST /functions/v1/search-rag`
   - enforce `strict_product_match: true`
   - for product query use `target: "product"` and `skip_vector_when_exact: true`
   - for policy/doc query use `target: "doc"`

4. Keep Messenger config centralized in dashboard/Supabase:
   - `POST /functions/v1/facebook-send` with `action: "update_config"`
   - payload: `pageId`, `pageName`, `pageAccessToken`, `webhookUrl`, `verifyToken`

5. Connection test:
   - `POST /functions/v1/facebook-send` with `action: "test_connection"`

## Exact product retrieval behavior

`search-rag` is configured for:

- exact product-name match first
- vector fallback only when exact match is not found
- chunk rerank by keyword overlap for documentation answers

That means the agent can answer for the exact requested product instead of scanning all products like the old Google Sheet flow.

## Chunk-based token control

- `embed-document` is incremental: only changed chunks are re-embedded.
- `search-rag` supports context caps (`max_context_chars`, `max_chunk_chars`) so LLM prompt size stays controlled.

## n8n environment variables (recommended)

- `SUPABASE_FUNCTION_BASE_URL=https://knfixatinuivgirybnew.supabase.co/functions/v1`
- `SUPABASE_ANON_KEY=<project anon key>`
- `N8N_WEBHOOK_URL=<your n8n webhook>`
- `FACEBOOK_VERIFY_TOKEN=<verify token>`

## Quick migration checklist

1. Remove all `graph.facebook.com/...access_token=...` hardcoded calls.
2. Remove all old `supabase.co/rest/v1/...` URLs from the workflow.
3. Add function-call nodes for `incoming-message`, `facebook-send`, `search-rag`, `log-error`.
4. Keep order write path in Google Sheets only if required; otherwise write to `orders` table for native dashboard reporting.
5. Test with one message, one image, one document question, and one order flow.
