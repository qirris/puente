import { BridgeMark } from './Icons'

export function ConfigScreen() {
  return (
    <div className="config-screen">
      <div className="config-card">
        <BridgeMark size={48} className="brand-mark" />
        <p className="eyebrow">Configuración pendiente</p>
        <h1>Conecta tu proyecto de Supabase</h1>
        <p>
          Puente necesita la URL del proyecto y la clave pública <code>anon</code>. Crea un
          archivo <code>.env</code> en la raíz con estas dos variables y reinicia el servidor:
        </p>
        <pre>
          <code>{`VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_clave_anon`}</code>
        </pre>
        <p className="muted">
          Tienes los pasos completos (migraciones, bucket privado y limpieza automática) en
          el <code>README.md</code> del proyecto. La clave <code>service_role</code> no debe
          aparecer nunca aquí.
        </p>
      </div>
    </div>
  )
}
