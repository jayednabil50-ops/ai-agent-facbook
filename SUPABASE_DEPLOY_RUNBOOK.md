# Supabase Function Deploy Runbook

Use this when the dashboard is connected to a new Supabase project but Edge Functions are not deployed yet.

## Project

- Project ref: `knfixatinuivgirybnew`

## 1) Login with the project owner account

```bash
supabase login
```

If CLI already logged in with another account, run:

```bash
supabase logout
supabase login
```

## 2) Link project

```bash
supabase link --project-ref knfixatinuivgirybnew
```

## 3) Set function secrets

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are reserved and provided by Supabase automatically.
Do not set secrets starting with `SUPABASE_` from CLI.

Optional (only if you will use Supabase vector functions `search-rag/embed-*`):

```bash
supabase secrets set --project-ref knfixatinuivgirybnew OPENAI_API_KEY=<your_openai_key>
supabase secrets set --project-ref knfixatinuivgirybnew OPENAI_BASE_URL=https://api.openai.com/v1
```

Alternative:
- You can skip CLI secrets and save `openai_api_key` + `openai_base_url`
  from Dashboard `AI Settings` page (stored in `app_settings`).

## 4) Apply database SQL (tables + RPC compatibility)

If `supabase db push` shows migration-history mismatch, apply SQL directly:

```bash
supabase db query --linked --file supabase/migrations/20260418_init_production_schema.sql
supabase db query --linked --file supabase/migrations/202604180001_fix_api_grants.sql
supabase db query --linked --file supabase/migrations/202604180002_embedding_hardening.sql
supabase db query --linked --file supabase/migrations/202604180003_n8n_vectorstore_compat.sql
```

If your migration history is already clean, you can use:

```bash
supabase db push --linked
```
## 5) Deploy functions

Route A: If OpenAI key stays only in n8n (no Supabase vector search):

```bash
supabase functions deploy facebook-send --project-ref knfixatinuivgirybnew
supabase functions deploy incoming-message --project-ref knfixatinuivgirybnew
supabase functions deploy log-error --project-ref knfixatinuivgirybnew
```

Route B: If Supabase will run vector embedding + retrieval:

```bash
supabase functions deploy facebook-send --project-ref knfixatinuivgirybnew
supabase functions deploy incoming-message --project-ref knfixatinuivgirybnew
supabase functions deploy log-error --project-ref knfixatinuivgirybnew
supabase functions deploy search-rag --project-ref knfixatinuivgirybnew
supabase functions deploy embed-product --project-ref knfixatinuivgirybnew
supabase functions deploy embed-document --project-ref knfixatinuivgirybnew
```

## 6) Verify each function endpoint

```bash
curl -i https://knfixatinuivgirybnew.supabase.co/functions/v1/facebook-send
curl -i https://knfixatinuivgirybnew.supabase.co/functions/v1/search-rag
curl -i https://knfixatinuivgirybnew.supabase.co/functions/v1/incoming-message
```

## Notes

- If you see `403` during deploy, your CLI account does not have project-owner deploy permission.
- If you see `404` on function URLs, deployment has not completed yet.
- Run all commands from your local terminal in this project folder:
  `C:\Users\MYPC\Downloads\bdeshishop-main\bdeshishop-main`
