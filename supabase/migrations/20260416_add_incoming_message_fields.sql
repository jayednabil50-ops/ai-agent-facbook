alter table public.messages
  add column if not exists facebook_id text,
  add column if not exists contact_name text,
  add column if not exists attachment_type text,
  add column if not exists is_carousel boolean not null default false,
  add column if not exists is_from_bot boolean not null default false,
  add column if not exists template_elements jsonb,
  add column if not exists message_type text not null default 'text';

update public.messages
set
  is_carousel = coalesce(is_carousel, false),
  is_from_bot = coalesce(is_from_bot, false),
  message_type = coalesce(nullif(message_type, ''), 'text');

alter table public.messages
  alter column is_carousel set default false,
  alter column is_from_bot set default false,
  alter column message_type set default 'text';
