import { useEffect, useRef } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { PLAYABLE_FACTIONS } from '../game'
import { usePreferences } from '../store/preferences'
import { playSynthCue } from '../services/audio'
import { useAudioMix, useSoundtrack } from '../services/useAudioMix'
import { AchievementToast } from '../components/AchievementToast'
import { withBase } from '../utils/assets'
import styles from './AppShell.module.css'

const links = [
  { to: '/', label: 'Inicio' },
  { to: '/play', label: 'Jugar' },
  { to: '/tower', label: 'Torre' },
  { to: '/multiplayer', label: 'Multijugador' },
  { to: '/gallery', label: 'Galería' },
  { to: '/illustrations', label: 'Ilustraciones' },
  { to: '/decks', label: 'Mazos' },
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
              {links.map((link, index) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  className={styles.navLink}
                  data-active={location.pathname === link.to}
                >
                  <span className={styles.navNumber} data-number={`0${index + 1}`} aria-hidden="true" /><span>{link.label}</span>
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
