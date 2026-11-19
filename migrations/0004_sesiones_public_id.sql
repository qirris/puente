-- Puente · identificador público de las sesiones
-- Permite listar y cerrar sesiones sin enviar nunca el token de acceso al
-- navegador. El identificador no da acceso a la cuenta: solo nombra la fila.

alter table sesiones add column public_id text;

-- Las sesiones ya abiertas reciben un identificador al aplicar la migración.
update sesiones set public_id = lower(hex(randomblob(16))) where public_id is null;

create unique index if not exists sesiones_public_id_idx on sesiones (public_id);
