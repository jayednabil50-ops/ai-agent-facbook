# BdeshiShop Dashboard (Production Supabase Setup)

This dashboard keeps the existing UI and upgrades backend integration for production:

- New Supabase project bootstrap SQL (all required tables + vector search + storage)
- Facebook Messenger send/test/config via Supabase Edge Function
- Product + document hybrid retrieval for n8n (exact product-name first, then vector)
- Error logging endpoint for n8n (`log-error`)
- Orders sourced from Supabase `orders` table (with Google Sheet fallback)

## 1) Frontend environment

Copy `.env.example` to `.env` and set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_DASHBOARD_PASSWORD`
- `VITE_GOOGLE_ORDERS_SHEET_URL` (Order source sheet URL)
- optional: `VITE_GOOGLE_ORDERS_SHEET_ID` (if you prefer using ID directly)
- optional: `VITE_GOOGLE_ORDERS_SHEET_GID` (tab gid, default `0`)

## 2) Create DB schema in new Supabase project

Run this SQL in Supabase SQL Editor:

- `supabase/migrations/20260418_init_production_schema.sql`
- then `supabase/migrations/20260416_add_incoming_message_fields.sql` (safe, idempotent)

## 3) Deploy Edge Functions

Deploy these functions:

- `incoming-message`
- `facebook-send`
- `embed-product`
- `embed-document`
- `search-rag`
- `log-error`

## 4) Set Supabase function secrets

Set required secrets for Edge Functions:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- optional: `FB_GRAPH_VERSION` (default `v24.0`)

## 5) Connect page config (from dashboard UI)

Go to **Connect Page** in dashboard and save:

- Facebook Page ID
- Facebook Page Access Token
- Webhook URL
- Verify Token

This writes configuration to `app_settings` + `connected_pages` and is used by `facebook-send`.

## 6) n8n integration endpoints

Use these endpoints in n8n:

- Incoming message ingest: `/functions/v1/incoming-message`
- Messenger send/config/test: `/functions/v1/facebook-send`
- Product/doc retrieval: `/functions/v1/search-rag`
- Error logging: `/functions/v1/log-error`

## 7) Vercel deploy

In Vercel project env vars, set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_DASHBOARD_PASSWORD`
- `VITE_GOOGLE_ORDERS_SHEET_URL`

## 8) Orders sync behavior

- Dashboard **Orders** now reads Google Sheet as primary source (10s refresh polling).
- If Google Sheet is unavailable, it falls back to Supabase `orders` table.
- So when n8n writes new orders to the sheet, dashboard reflects them automatically.

Then deploy normally.
