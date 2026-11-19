-- Puente · bucket privado y permisos de Storage
-- El bucket NO es público. Cada usuario solo puede operar en su carpeta:
--   <user_id>/<uuid>-<nombre-del-archivo>
-- Límite duro de 20 MB por archivo, además de la validación del cliente y la BD.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('puente', 'puente', false, 20971520, null)
on conflict (id) do update
set
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = null;

drop policy if exists "puente_files_select_own" on storage.objects;
create policy "puente_files_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'puente'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "puente_files_insert_own" on storage.objects;
create policy "puente_files_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'puente'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "puente_files_update_own" on storage.objects;
create policy "puente_files_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'puente'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'puente'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "puente_files_delete_own" on storage.objects;
create policy "puente_files_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'puente'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
