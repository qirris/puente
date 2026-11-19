-- Puente · esquema principal
-- Ejecutar como migración (Supabase CLI) o en el SQL Editor, en orden.
-- No contiene secretos.

create extension if not exists pgcrypto;

do $$
begin
  create type public.item_kind as enum ('text', 'link', 'image', 'file');
exception
  when duplicate_object then null;
end
$$;

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind public.item_kind not null,
  content text,
  storage_path text,
  file_name text,
  mime_type text,
  size_bytes bigint,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),

  constraint items_content_length check (
    content is null or char_length(content) between 1 and 10000
  ),
  constraint items_payload check (
    (
      kind in ('text', 'link')
      and content is not null
      and btrim(content) <> ''
      and storage_path is null
      and file_name is null
      and size_bytes is null
    )
    or
    (
      kind in ('image', 'file')
      and content is null
      and storage_path is not null
      and file_name is not null
      and size_bytes is not null
      and size_bytes > 0
      and size_bytes <= 20971520
    )
  ),
  constraint items_link_http check (
    kind <> 'link' or content ~* '^https?://[^[:space:]]+$'
  ),
  constraint items_storage_path_key unique (storage_path)
);

create index if not exists items_user_created_idx
  on public.items (user_id, created_at desc);

create index if not exists items_expiry_idx
  on public.items (expires_at)
  where pinned = false;

-- El trigger normaliza el alta y protege los campos inmutables en updates.
-- Solo se puede cambiar `pinned` desde el cliente. Al desfijar, se da otras 24 h.
create or replace function public.items_before_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.user_id := coalesce(auth.uid(), new.user_id);
    new.created_at := now();
    new.expires_at := now() + interval '24 hours';
    new.pinned := coalesce(new.pinned, false);
    return new;
  end if;

  new.id := old.id;
  new.user_id := old.user_id;
  new.kind := old.kind;
  new.content := old.content;
  new.storage_path := old.storage_path;
  new.file_name := old.file_name;
  new.mime_type := old.mime_type;
  new.size_bytes := old.size_bytes;
  new.created_at := old.created_at;

  if new.pinned is distinct from old.pinned then
    if new.pinned then
      new.expires_at := old.expires_at;
    else
      new.expires_at := now() + interval '24 hours';
    end if;
  else
    new.expires_at := old.expires_at;
  end if;

  return new;
end;
$$;

drop trigger if exists items_before_write on public.items;
create trigger items_before_write
  before insert or update on public.items
  for each row
  execute function public.items_before_write();

-- Row Level Security: cada cuenta solo ve y modifica sus filas.
alter table public.items enable row level security;

drop policy if exists "items_select_own" on public.items;
create policy "items_select_own"
  on public.items for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "items_insert_own" on public.items;
create policy "items_insert_own"
  on public.items for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "items_update_own" on public.items;
create policy "items_update_own"
  on public.items for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "items_delete_own" on public.items;
create policy "items_delete_own"
  on public.items for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.items from anon;
grant select, insert, update, delete on public.items to authenticated;

-- Realtime opcional: refresca la bandeja al instante si hay dos sesiones abiertas.
alter table public.items replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.items;
exception
  when duplicate_object then null;
  when undefined_object then null;
end
$$;
