-- Puente · caducidad elegida al crear cada envío.
-- Se guarda el plazo para que, si el envío se fija y luego se desfija,
-- recupere el mismo tiempo en lugar de volver siempre a 24 horas.

alter table items
  add column duracion_horas integer not null default 24
  check (duracion_horas in (1, 24, 168));
