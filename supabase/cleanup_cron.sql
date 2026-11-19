-- Puente · programación de la limpieza automática
--
-- Requisitos:
--   1. Tener desplegada la función `cleanup-expired`.
--   2. Activar las extensiones `pg_cron` y `pg_net` en Supabase
--      (Dashboard → Database → Extensions).
--   3. Ejecutar este archivo en el SQL Editor, sustituyendo los placeholders.
--
-- La clave service_role se guarda cifrada en Supabase Vault y solo la usa
-- pg_cron desde el servidor. NUNCA debe ir en el frontend ni en un .md.

-- 1) Guarda la URL del proyecto y la service_role key en Vault.
--    (Si ya existen, usa vault.update_secret con el id correspondiente.)
select vault.create_secret(
  'https://TU-PROYECTO.supabase.co',
  'puente_project_url',
  'URL del proyecto Supabase de Puente'
);

select vault.create_secret(
  'TU_SERVICE_ROLE_KEY',
  'puente_service_role_key',
  'Clave usada solo por la limpieza programada de Puente'
);

-- 2) Programa la limpieza cada 15 minutos.
select cron.unschedule('puente-cleanup')
where exists (select 1 from cron.job where jobname = 'puente-cleanup');

select cron.schedule(
  'puente-cleanup',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'puente_project_url')
      || '/functions/v1/cleanup-expired',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'puente_service_role_key'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- 3) Comprobación:
--    select * from cron.job where jobname = 'puente-cleanup';
--    select * from cron.job_run_details order by start_time desc limit 10;
--    select * from net._http_response order by created desc limit 5;
