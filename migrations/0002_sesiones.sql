-- Puente · sesiones de acceso
-- Sustituye a Supabase Auth. El token se guarda en D1 y se envía en cada
-- petición; el Worker comprueba que no haya caducado. Así no hay secretos
-- que configurar a mano y se puede cerrar la sesión de verdad.

create table if not exists sesiones (
  token text primary key,
  user_id text not null references users (id) on delete cascade,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at text not null default (
    strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+30 days')
  )
);

create index if not exists sesiones_user_idx on sesiones (user_id);
create index if not exists sesiones_expiry_idx on sesiones (expires_at);
