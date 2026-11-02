import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { PLAYABLE_FACTIONS } from '../game'
import { usePreferences } from '../store/preferences'
import { playSynthCue } from '../services/audio'
import { useAudioMix, useSoundtrack } from '../services/useAudioMix'
import { AchievementToast } from '../components/AchievementToast'
import { withBase } from '../utils/assets'
import styles from './AppShell.module.css'

/**
 * Icono de cada sección (trazos propios, 24×24). Sustituyen a los números
 * 01–08, que no decían nada: ahora cada sección se reconoce de un vistazo.
 */
const ICONS = {
  home: 'M4 11 12 4l8 7M6 9.5V20h12V9.5M10 20v-5h4v5',
  play: 'M5 19 15 9M9 5l10 10M14 4l6 6M4 14l6 6M7 17l-3 3M17 7l3-3',
  tower: 'M7 21V8l-2-2V3h2v2h2V3h2v2h2V3h2v2h2V3h2v3l-2 2v13ZM10 21v-4h4v4M10 11h4',
  versus: 'M8 8a3 3 0 1 0 .01 0ZM16 8a3 3 0 1 0 .01 0ZM3 20c0-3 2.2-5 5-5s5 2 5 5M11 20c0-3 2.2-5 5-5s5 2 5 5',
  gallery: 'M7 4h10a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM3 7v12M21 7v12M9 9h6',
  art: 'M4 5h16v14H4ZM4 15l5-5 4 4 3-3 4 4M15.5 8.5h.01',
  decks: 'M6 7h11v13H6ZM9 4h11v13M3 10v10',
  album: 'M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2ZM5 18a2 2 0 0 1 2-2h12M12 7l1.2 2.4 2.6.4-1.9 1.8.5 2.6L12 13l-2.4 1.2.5-2.6-1.9-1.8 2.6-.4Z',
} as const

const links: readonly { readonly to: string; readonly label: string; readonly icon: keyof typeof ICONS; readonly primary?: boolean }[] = [
  { to: '/', label: 'Inicio', icon: 'home' },
  { to: '/play', label: 'Jugar', icon: 'play', primary: true },
  { to: '/tower', label: 'Torre', icon: 'tower' },
  { to: '/multiplayer', label: 'Multijugador', icon: 'versus' },
  { to: '/gallery', label: 'Galería', icon: 'gallery' },
  { to: '/illustrations', label: 'Ilustraciones', icon: 'art' },
  { to: '/decks', label: 'Mazos', icon: 'decks' },
  { to: '/album', label: 'Álbum', icon: 'album' },
]

export function AppShell() {
  const location = useLocation()
  const { muted, setMuted } = usePreferences()
  const isBattle = location.pathname === '/battle'
  useAudioMix()
  // Tema de menús: la batalla monta el suyo (el del escenario), así que fuera
  // de /battle suena este y dentro no se pisan.
  useSoundtrack('menu', !isBattle)

  /**
   * En móvil la barra de secciones no cabe y se desplaza de lado. Al entrar en
   * una sección del final (Galería, Mazos) la barra se quedaba al principio:
   * no se veía ni el nombre de la sección ni su subrayado, así que no había
   * forma de saber dónde estabas. Aquí se trae la pestaña activa a la vista.
   */
  const navRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const activo = navRef.current?.querySelector<HTMLElement>('[data-active="true"]')
    // `block: 'nearest'` a propósito: sin él el navegador también desplaza la
    // página en vertical y la sección aparecería ya empezada.
    activo?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [location.pathname])

  const toggleSound = () => {
    if (muted) playSynthCue('ui')
    setMuted(!muted)
  }

  return (
    <>
      {/* Instancia única fuera de la rama battle/no-battle: si viviera duplicada
          en ambas, cada navegación entre /battle y el resto la remontaría y
          perdería el registro de qué logros ya se anunciaron en esta sesión. */}
      <AchievementToast />
      {isBattle ? (
        <Outlet />
      ) : (
        <div className={styles.shell} data-immersive={location.pathname === '/' || location.pathname === '/tower'}>
          <img className={styles.worldBackdrop} src={withBase('/assets/interface/nexo-convergencia-v1-small.webp')} alt="" aria-hidden="true" />
          <header className={styles.header}>
            <NavLink to="/" className={styles.brand} aria-label="Crónicas del Nexo, inicio">
              <span className={styles.brandMark} aria-hidden="true"><span>✦</span></span>
              <span className={styles.brandText}>
                <strong>CRÓNICAS DEL NEXO</strong>
                <small>El destino está en tus cartas</small>
              </span>
            </NavLink>
            <nav ref={navRef} className={styles.nav} aria-label="Navegación principal">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  className={styles.navLink}
                  data-active={location.pathname === link.to}
                  data-primary={link.primary || undefined}
                >
                  <svg className={styles.navIcon} viewBox="0 0 24 24" aria-hidden="true">
                    <path d={ICONS[link.icon]} />
                  </svg>
                  <span>{link.label}</span>
                </NavLink>
              ))}
            </nav>
            <div className={styles.actions}>
              <button className={styles.iconButton} onClick={toggleSound} aria-label={muted ? 'Activar sonido' : 'Silenciar'} title={muted ? 'Activar sonido' : 'Silenciar'}>
                {muted ? '◌' : '♪'}
              </button>
              <NavLink className={styles.iconButton} to="/settings" aria-label="Ajustes" title="Ajustes">⚙</NavLink>
            </div>
          </header>
          <main className={styles.main}><Outlet /></main>
          <footer className={styles.footer}>
            <span className={styles.footerBrand}>✦ CRÓNICAS DEL NEXO</span>
            <span>{PLAYABLE_FACTIONS.length} FACCIONES · INFINITAS CRÓNICAS</span>
          </footer>
        </div>
      )}
    </>
  )
}
