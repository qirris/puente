// Puente · limpieza programada de envíos caducados
//
// Borra el archivo del bucket privado y después el registro de la base de datos.
// Se invoca con la clave service_role (nunca desde el navegador):
//   curl -X POST "$SUPABASE_URL/functions/v1/cleanup-expired" \
//        -H "Authorization: Bearer $SERVICE_ROLE_KEY"
//
// Despliegue: supabase functions deploy cleanup-expired

import { createClient } from 'npm:@supabase/supabase-js@2'

const BUCKET = 'puente'
const BATCH_SIZE = 500
const MAX_ROUNDS = 10

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (request.method !== 'POST') {
    return json({ error: 'Método no permitido.' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Faltan variables de entorno del proyecto.' }, 500)
  }

  const authorization = request.headers.get('Authorization') ?? ''
  if (authorization !== `Bearer ${serviceRoleKey}`) {
    return json({ error: 'No autorizado.' }, 401)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const cutoff = new Date().toISOString()
  let deleted = 0

  try {
    for (let round = 0; round < MAX_ROUNDS; round += 1) {
      const { data, error } = await admin
        .from('items')
        .select('id, storage_path')
        .eq('pinned', false)
        .lt('expires_at', cutoff)
        .order('expires_at', { ascending: true })
        .limit(BATCH_SIZE)

      if (error) throw error

      const rows = (data ?? []) as { id: string; storage_path: string | null }[]
      if (rows.length === 0) break

      const paths = rows
        .map((row) => row.storage_path)
        .filter((path): path is string => Boolean(path))

      // Primero los archivos: si falla Storage, no borramos registros para no
      // dejar objetos huérfanos. La siguiente ejecución lo reintentará.
      for (let index = 0; index < paths.length; index += 100) {
        const chunk = paths.slice(index, index + 100)
        const { error: storageError } = await admin.storage.from(BUCKET).remove(chunk)
        if (storageError) {
          throw new Error(`No se pudieron borrar archivos: ${storageError.message}`)
        }
      }

      const ids = rows.map((row) => row.id)
      const { error: deleteError, count } = await admin
        .from('items')
        .delete({ count: 'exact' })
        .in('id', ids)
        .eq('pinned', false)

      if (deleteError) throw deleteError
      deleted += count ?? ids.length

      if (rows.length < BATCH_SIZE) break
    }

    return json({ ok: true, deleted, cutoff })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado.'
    console.error('[puente-cleanup]', message)
    return json({ ok: false, error: message, deleted, cutoff }, 500)
  }
})
