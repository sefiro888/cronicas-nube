import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { ChunkErrorBoundary, clearChunkReloadFlag } from './ChunkErrorBoundary'
import { AppShell } from './layout/AppShell'
import { HomePage } from './pages/HomePage'

const BattlePage = lazy(() => import('./pages/BattlePage').then((module) => ({ default: module.BattlePage })))
const DecksPage = lazy(() => import('./pages/DecksPage').then((module) => ({ default: module.DecksPage })))
const AlbumPage = lazy(() => import('./pages/AlbumPage').then((module) => ({ default: module.AlbumPage })))
const GalleryPage = lazy(() => import('./pages/GalleryPage').then((module) => ({ default: module.GalleryPage })))
const IllustrationsPage = lazy(() => import('./pages/IllustrationsPage').then((module) => ({ default: module.IllustrationsPage })))
const MultiplayerPage = lazy(() => import('./pages/MultiplayerPage').then((module) => ({ default: module.MultiplayerPage })))
const PlayPage = lazy(() => import('./pages/PlayPage').then((module) => ({ default: module.PlayPage })))
const TowerPage = lazy(() => import('./pages/TowerPage').then((module) => ({ default: module.TowerPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))

export function App() {
  // Un montaje sin errores confirma que los fragmentos de esta sesión
  // cargan bien: libera el aviso de recarga por si hiciera falta otra
  // vez más adelante (otro despliegue mientras esta pestaña sigue abierta).
  useEffect(() => clearChunkReloadFlag(), [])

  return (
    <ChunkErrorBoundary>
      <Suspense fallback={<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--gold)' }}>Abriendo la crónica…</div>}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<HomePage />} />
            <Route path="play" element={<PlayPage />} />
            <Route path="multiplayer" element={<MultiplayerPage />} />
            <Route path="gallery" element={<GalleryPage />} />
            <Route path="illustrations" element={<IllustrationsPage />} />
            <Route path="decks" element={<DecksPage />} />
            <Route path="album" element={<AlbumPage />} />
            <Route path="tower" element={<TowerPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="battle" element={<BattlePage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ChunkErrorBoundary>
  )
}
