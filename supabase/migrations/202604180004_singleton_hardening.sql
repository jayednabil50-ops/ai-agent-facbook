-- Ensure singleton tables remain singleton in production.
-- This prevents random row selection bugs when code expects one row.

-- 1) ai_settings: keep latest row, remove extras, enforce singleton.
with ranked as (
  select id,
         row_number() over (order by updated_at desc nulls last, created_at desc nulls last, id) as rn
  from public.ai_settings
)
delete from public.ai_settings a
using ranked r
where a.id = r.id
  and r.rn > 1;

insert into public.ai_settings (id, ai_name, instructions, ai_active)
select '00000000-0000-0000-0000-000000000001'::uuid, 'ShopBot AI', '', true
where not exists (select 1 from public.ai_settings);

create unique index if not exists ai_settings_singleton_idx
  on public.ai_settings ((true));

-- 2) connected_pages: keep latest row, remove extras, enforce singleton.
with ranked as (
  select id,
         row_number() over (order by updated_at desc nulls last, connected_on desc nulls last, created_at desc nulls last, id) as rn
  from public.connected_pages
)
delete from public.connected_pages p
using ranked r
where p.id = r.id
  and r.rn > 1;

insert into public.connected_pages (id, page_name, page_id, webhook_url, status)
select '00000000-0000-0000-0000-000000000001'::uuid, 'Facebook Page', '', '', 'disconnected'
where not exists (select 1 from public.connected_pages);

create unique index if not exists connected_pages_singleton_idx
  on public.connected_pages ((true));
