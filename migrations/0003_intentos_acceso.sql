-- Puente · límite de intentos de acceso
-- Registra los fallos de inicio de sesión por correo y dirección IP.
-- La ventana se fija en el Worker (15 minutos, 5 intentos) y se limpia
-- con el cron de mantenimiento.

create table if not exists intentos_acceso (
  clave text primary key,
  fallos integer not null default 0,
  primera_at text not null,
  ultima_at text not null
);

create index if not exists intentos_acceso_ultima_idx
  on intentos_acceso (ultima_at);
