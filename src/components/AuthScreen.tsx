import { useEffect, useState, type FormEvent } from 'react'
import { iniciarSesion, registrar } from '../lib/auth'
import {
  BridgeMark,
  IconAlert,
  IconEye,
  IconEyeOff,
  IconLock,
  IconMail,
} from './Icons'

type Mode = 'login' | 'signup'

function translateAuthError(message: string): string {
  const raw = message.toLowerCase()
  if (raw.includes('incorrectos') || raw.includes('unauthorized')) {
    return 'Email o contraseña incorrectos.'
  }
  if (raw.includes('ya existe una cuenta')) {
    return 'Ya existe una cuenta con ese email. Inicia sesión.'
  }
  if (raw.includes('al menos 6')) {
    return 'La contraseña debe tener al menos 6 caracteres.'
  }
  if (raw.includes('email válido') || raw.includes('invalid email')) {
    return 'Escribe un email válido.'
  }
  if (raw.includes('no se pudo conectar') || raw.includes('fetch') || raw.includes('network')) {
    return 'No se pudo conectar con Puente. Revisa tu conexión.'
  }
  return message
}

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    setError(null)
    setNotice(null)
    setPassword('')
    setShowPassword(false)
  }, [mode])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    const cleanEmail = email.trim()
    if (!cleanEmail || !password) {
      setError('Escribe tu email y tu contraseña.')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setSubmitting(true)
    setError(null)
    setNotice(null)

    try {
      if (mode === 'login') {
        await iniciarSesion(cleanEmail, password)
      } else {
        await registrar(cleanEmail, password)
        setNotice('Cuenta creada. Ya estás dentro.')
      }
      setEmail('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo completar la operación.'
      setError(translateAuthError(message))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-story" aria-label="Presentación de Puente">
        <div className="auth-brand">
          <BridgeMark size={42} className="brand-mark" />
          <div>
            <span className="wordmark">Puente</span>
            <span className="tagline">Móvil ↔ ordenador</span>
          </div>
        </div>

        <div className="auth-hero">
          <p className="eyebrow">Tu bandeja privada</p>
          <h1>
            Lo que dejas <em>aquí</em>,
            <br /> te espera <em>allí</em>.
          </h1>
          <p className="lede">
            Enlaces, notas, fotos y archivos entre tus dispositivos. Sin cables, sin
            compartir Wi-Fi y sin depender de que los dos estén encendidos a la vez.
          </p>
        </div>

        <ul className="auth-points">
          <li>
            <span className="point-number">01</span>
            <div>
              <strong>Envía y olvídate</strong>
              <p>Se queda guardado en tu bandeja, listo para cuando enciendas el otro equipo.</p>
            </div>
          </li>
          <li>
            <span className="point-number">02</span>
            <div>
              <strong>Caduca de verdad</strong>
              <p>A las 24 horas se borra el registro y el archivo. Fija lo importante para conservarlo.</p>
            </div>
          </li>
          <li>
            <span className="point-number">03</span>
            <div>
              <strong>Solo para tus ojos</strong>
              <p>Cada cuenta ve únicamente su bandeja, con permisos aplicados a registros y archivos.</p>
            </div>
          </li>
        </ul>

        <p className="auth-footnote">
          Almacenamiento privado · Sesión persistente · Sin claves privadas en el navegador
        </p>

        <svg className="auth-arches" viewBox="0 0 420 220" aria-hidden="true">
          <path d="M-20 190c0-95 78-172 173-172s173 77 173 172" />
          <path d="M40 190c0-70 57-127 127-127s127 57 127 127" />
          <path d="M100 190c0-44 36-80 80-80s80 36 80 80" />
          <path d="M-20 190h460" />
        </svg>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-card-head">
            <p className="eyebrow">{mode === 'login' ? 'Bienvenido de nuevo' : 'Primera vez'}</p>
            <h2>{mode === 'login' ? 'Entra en tu bandeja' : 'Crea tu cuenta'}</h2>
            <p>
              {mode === 'login'
                ? 'La misma cuenta en el móvil y en el ordenador.'
                : 'Una cuenta, una bandeja privada en todos tus dispositivos.'}
            </p>
          </div>

          <div className="auth-tabs" role="group" aria-label="Acceso o registro">
            <button
              type="button"
              className={mode === 'login' ? 'active' : ''}
              onClick={() => setMode('login')}
              aria-pressed={mode === 'login'}
            >
              Entrar
            </button>
            <button
              type="button"
              className={mode === 'signup' ? 'active' : ''}
              onClick={() => setMode('signup')}
              aria-pressed={mode === 'signup'}
            >
              Crear cuenta
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <label className="field">
              <span>Email</span>
              <div className="input-shell">
                <IconMail size={18} className="input-icon" />
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoFocus
                  required
                />
              </div>
            </label>

            <label className="field">
              <span>Contraseña</span>
              <div className="input-shell">
                <IconLock size={18} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder={mode === 'login' ? 'Tu contraseña' : 'Mínimo 6 caracteres'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  className="input-action"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                </button>
              </div>
            </label>

            {error ? (
              <p className="form-message error" role="alert">
                <IconAlert size={17} />
                {error}
              </p>
            ) : null}

            {notice ? (
              <p className="form-message success" role="status">
                {notice}
              </p>
            ) : null}

            <button type="submit" className="button button-primary auth-submit" disabled={submitting}>
              {submitting ? <span className="spinner spinner-inline" aria-hidden="true" /> : null}
              {submitting
                ? mode === 'login'
                  ? 'Entrando…'
                  : 'Creando cuenta…'
                : mode === 'login'
                  ? 'Entrar'
                  : 'Crear mi cuenta'}
            </button>
          </form>

          <p className="auth-switch">
            {mode === 'login' ? '¿Todavía no tienes cuenta?' : '¿Ya tienes una cuenta?'}{' '}
            <button
              type="button"
              className="link-button"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            >
              {mode === 'login' ? 'Créala ahora' : 'Entra aquí'}
            </button>
          </p>
        </div>
      </section>
    </div>
  )
}
