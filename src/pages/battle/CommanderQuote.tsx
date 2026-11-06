import type { CSSProperties } from 'react'
import { FACTION_BY_ID, type CommanderDefinition } from '../../game'
import { withBase } from '../../utils/assets'
import styles from './CommanderQuote.module.css'

/**
 * Bocadillo del comandante: su retrato y la frase, del lado de su bando (el
 * propio abajo a la izquierda, el rival arriba a la derecha). Entra con un
 * pequeño rebote y se va solo; no tapa el centro del tablero.
 */
export function CommanderQuote({ commander, text, mine, duel }: { commander: CommanderDefinition; text: string; mine: boolean; duel?: boolean }) {
  return (
    <div
      className={styles.quote}
      data-side={mine ? 'own' : 'rival'}
      data-duel={duel || undefined}
      style={{ '--accent': FACTION_BY_ID[commander.faction].accentColor } as CSSProperties}
      role="status"
      aria-live="polite"
    >
      <img src={withBase(commander.art.webp)} alt="" />
      <p className={styles.bubble}>
        <strong>{commander.name}</strong>
        <span>«{text}»</span>
      </p>
    </div>
  )
}
