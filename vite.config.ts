import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // El icono de commander ya sirve de logo; el manifest usa rutas
      // relativas (sin "/" inicial) para resolver bien tanto en local como
      // bajo el subdirectorio /magicfable/ de GitHub Pages.
      manifest: {
        id: '.',
        name: 'Crónicas del Nexo',
        short_name: 'Crónicas',
        description: 'Juego táctico de cartas: canaliza la Esencia, despliega tus cartas sobre un tablero 8×8 y quiebra el Nexo de tu rival.',
        lang: 'es',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#0b0e16',
        theme_color: '#0b0e16',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // El "shell" de la app (JS/CSS/HTML) se precachea al instalar. El arte
        // de las 90 cartas y el GLB del escenario NO se precachean de
        // entrada (sumarían varios MB a la instalación); en su lugar se
        // cachean bajo demanda la primera vez que se ven (runtimeCaching más
        // abajo), así que tras jugar unas partidas el offline es cada vez
        // más completo sin penalizar la primera visita.
        globPatterns: ['**/*.{js,css,html}'],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/(cards\/(?:art|frames)|scenarios|interface)\/.*\.(webp|svg|png|glb)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'game-art',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
        ],
      },
    }),
  ],
  build: { chunkSizeWarningLimit: 1_000 },
  server: { port: 4173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    css: true,
    coverage: { reporter: ['text', 'html'] },
  },
})
