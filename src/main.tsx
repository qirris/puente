import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AvisoActualizacion } from './components/AvisoActualizacion'
import { iniciarActualizaciones } from './lib/actualizaciones'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <AvisoActualizacion />
  </StrictMode>,
)

// La interfaz funciona igual si el navegador no admite service workers.
if (import.meta.env.PROD) {
  window.addEventListener('load', () => { void iniciarActualizaciones() })
}
