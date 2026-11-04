import type { CSSProperties, ReactNode } from 'react'
import { streakLevel } from '../store/profile'
import styles from './ProfileBadges.module.css'

/**
 * Retrato con el marco de perfil elegido (bronce, llamas, tormenta, prisma...).
 * Cada marco tiene su animación propia; con movimiento reducido queda quieto.
 */
export function FramedPortrait({ src, frameId, size = 72, children }: { src?: string; frameId: string; size?: number; children?: ReactNode }) {
  return (
    <span className={styles.framed} data-frame={frameId} style={{ '--size': `${size}px` } as CSSProperties}>
      <span className={styles.ring} aria-hidden="true" />
      {src && <img src={src} alt="" />}
      {children}
    </span>
  )
}

const STREAK_TEXT = ['', 'En racha', 'Imparable', 'Arrollador', 'Legendario'] as const

/**
 * Emblema de racha de victorias: una llama que se enciende con la primera
 * victoria seguida y crece a las 3, 5 y 10. Sin racha no se muestra.
 */
export function StreakEmblem({ streak, compact = false }: { streak: number; compact?: boolean }) {
  const level = streakLevel(streak)
  if (level === 0) return null
  return (
    <span className={styles.streak} data-level={level} data-compact={compact || undefined} title={`${streak} victorias seguidas`}>
      <span className={styles.flame} aria-hidden="true">
        <i /><i /><i />
      </span>
      <strong>×{streak}</strong>
      {!compact && <small>{STREAK_TEXT[level]}</small>}
    </span>
  )
}
