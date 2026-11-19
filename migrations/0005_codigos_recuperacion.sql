-- Puente · códigos de recuperación de contraseña
-- El código se muestra una sola vez. En D1 solo se guarda su hash PBKDF2,
-- nunca el valor en claro. Una sola fila por cuenta: generar uno nuevo
-- invalida el anterior.

create table if not exists codigos_recuperacion (
  user_id text primary key references users (id) on delete cascade,
  hash text not null,
  fallos integer not null default 0 check (fallos >= 0),
  creado_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at text not null
);

create index if not exists codigos_recuperacion_expiry_idx
  on codigos_recuperacion (expires_at);
