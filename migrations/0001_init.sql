-- Puente · esquema inicial para Cloudflare D1 (SQLite)
-- Traducción fiel de supabase/migrations/20261116090000_puente_schema.sql
-- a dialecto SQLite. Sin secretos.
--
-- Nota: Supabase delegaba la identidad en auth.users y la seguridad en RLS.
-- En Cloudflare no hay servicio de autenticación ni RLS: la tabla `users`
-- se gestiona desde el Worker y TODO el control de acceso se aplica ahí.

create table if not exists users (
  id text primary key,
  email text not null unique,
  password_hash text not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists items (
  id text primary key,
  user_id text not null references users (id) on delete cascade,
  kind text not null check (kind in ('text', 'link', 'image', 'file')),
  content text,
  storage_path text unique,
  file_name text,
  mime_type text,
  size_bytes integer,
  pinned integer not null default 0 check (pinned in (0, 1)),
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at text not null default (
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+24 hours')
  ),

  constraint items_content_length check (
    content is null or length(content) between 1 and 10000
  ),
  constraint items_payload check (
    (
      kind in ('text', 'link')
      and content is not null
      and trim(content) <> ''
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
    kind <> 'link'
    or (
      (lower(content) like 'http://%' or lower(content) like 'https://%')
      and instr(content, ' ') = 0
      and instr(content, char(9)) = 0
      and instr(content, char(10)) = 0
      and instr(content, char(13)) = 0
    )
  )
);

create index if not exists items_user_created_idx
  on items (user_id, created_at desc);

create index if not exists items_expiry_idx
  on items (expires_at)
  where pinned = 0;

-- El trigger de Postgres que bloqueaba cambios inmutables no tiene equivalente
-- directo en SQLite (no se puede asignar a NEW.*). Esas reglas se aplican en
-- src/index.ts: el Worker es el único punto de entrada y, por tanto, la
-- frontera de seguridad. La caducidad y el fijado se resuelven también allí.
