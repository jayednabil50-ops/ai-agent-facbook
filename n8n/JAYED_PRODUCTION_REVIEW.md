# Jayed Workflow Production Review

## Scope Reviewed
- Source workflow: `C:\Users\MYPC\Downloads\jayed.json`
- Fixed import workflow: `C:\Users\MYPC\Downloads\bdeshishop-main\bdeshishop-main\n8n\jayed.production.fixed.json`
- Dashboard hooks/pages + Supabase migrations

## Critical Issues Found (and fixed in the new JSON)

1. Global AI ON/OFF check was wrong in runtime branch.
- `If10` and `If12` were checking conversation-level `ai_enabled` again instead of global `ai_active`.
- Result: top global switch in dashboard could appear ON/OFF but bot logic would not follow correctly.

2. AI system prompt binding was wrong.
- `AI Agent1` used `{{$json.data}}`, but prompt nodes return `instructions` field.
- Result: custom prompt updates from dashboard often did not apply.

3. Conversation ID fallback was incomplete when saving AI reply.
- Voice branch was missing in fallback chain.
- Result: `conversation_id` could become empty in message save, causing insert failure or missing inbox data.

4. Product image tool had wrong product-name source.
- It was taking customer/profile data in one path instead of product name.
- Result: wrong image/card sent or lookup mismatch.

5. Image/voice upsert contact name depended on profile nodes that are not always executed.
- Result: branch execution errors in some message types.

6. Docs retrieval tool was missing in the main sales agent flow.
- Result: product search worked, but policy/document answers were weak or unrelated.

7. Facebook tokens/page id were hardcoded.
- Result: token rotation pain, accidental leaks, and brittle deploys.

## Additional Production Risks Still To Handle In n8n UI

1. Set these environment variables in n8n and keep them in Credentials/Env (not hardcoded):
- `FACEBOOK_PAGE_ID`
- `FACEBOOK_PAGE_ACCESS_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `OPENAI_API_KEY` (for embedding functions)

2. Verify sub-workflow IDs still match your n8n instance:
- `send a videao`
- `send_a_image``
- `post_back`

3. Rotate compromised tokens/keys immediately because they were shared in plain JSON.

## What Was Verified In Frontend/Supabase

- Dashboard build passes.
- Test suite passes.
- Schema includes all required sections for inbox/orders/products/docs/ai settings/error logs/reporting.
- Vector compatibility migration exists for n8n Supabase Vector Store RPC signatures.

## Final Import Recommendation

- Import only: `n8n/jayed.production.fixed.json`
- Run test sequence:
  1. Customer text
  2. Customer image
  3. Customer voice
  4. Product query (exact model)
  5. Policy/document query
  6. AI off (single customer)
  7. AI off (global)

If all 7 pass, this workflow is production-ready for your current architecture.

## New DB Hardening Added

- Added migration: `supabase/migrations/202604180004_singleton_hardening.sql`
- Enforces singleton behavior for:
  - `ai_settings`
  - `connected_pages`
- Prevents multi-row drift that breaks global AI toggle and page config reads.
