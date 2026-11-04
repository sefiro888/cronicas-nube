import type { CSSProperties } from 'react'
import { FACTION_BY_ID, type CommanderDefinition } from '../../game'
import { withBase } from '../../utils/assets'
import styles from './TurnBanner.module.css'

interface TurnBannerProps {
  readonly text: string
  readonly mine: boolean
  readonly commander?: CommanderDefinition
  readonly turn: number
  readonly reducedMotion: boolean
}

/**
 * Cambio de turno con la cara de quien lo juega. El texto suelto «Turno
 * rival» se perdía entre los demás avisos; una franja del color de la
 * facción con el retrato del comandante se reconoce sin leerla.
 */
export function TurnBanner({ text, mine, commander, turn, reducedMotion }: TurnBannerProps) {
  const accent = commander ? FACTION_BY_ID[commander.faction].accentColor : '#d8b46a'
  return (
    <div className={styles.banner} data-side={mine ? 'own' : 'rival'} data-reduced-motion={reducedMotion || undefined} role="status" style={{ '--accent': accent } as CSSProperties}>
      {/* Barrido: el comandante cruza la franja en grande, recortado en
          diagonal, con un filo de luz delante. Va antes del retrato para que
          este quede encima y se siga leyendo quién juega. */}
      {commander && !reducedMotion && (
        <span className={styles.sweep} aria-hidden="true">
          <img src={withBase(commander.art.webp)} alt="" />
        </span>
      )}
      {!reducedMotion && <span className={styles.edge} aria-hidden="true" />}
      <span className={styles.band} aria-hidden="true" />
      <span className={styles.portrait} aria-hidden="true">
        {commander && <img src={withBase(commander.art.webp)} alt="" />}
      </span>
      <span className={styles.copy}>
        <strong>{text}</strong>
        <small>{commander ? `${commander.name} · Turno ${turn}` : `Turno ${turn}`}</small>
      </span>
    </div>
  )
}
