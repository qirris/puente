import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react(), {
    name: 'versionar-interfaz',
    apply: 'build',
    async closeBundle() {
      const salida = resolve(import.meta.dirname, 'dist')
      const recursos = (await readdir(resolve(salida, 'assets'))).sort()
      const plantilla = await readFile(resolve(import.meta.dirname, 'public/sw.js'), 'utf8')
      const huella = createHash('sha256').update(plantilla)
      huella.update(await readFile(resolve(salida, 'index.html')))
      for (const recurso of recursos) {
        huella.update(recurso).update(await readFile(resolve(salida, 'assets', recurso)))
      }
      const codigo = plantilla
        .replace('__VERSION__', huella.digest('hex').slice(0, 16))
        .replace("'__RECURSOS__'", recursos.map((recurso) => JSON.stringify(`/assets/${recurso}`)).join(', '))
      await writeFile(resolve(salida, 'sw.js'), codigo)
    },
  }],
  server: {
    port: 5173,
    // En desarrollo, la API del Worker de Wrangler escucha en 8787.
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
