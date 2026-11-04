import { useEffect, type CSSProperties } from 'react'
import { FACTION_BY_ID, type CommanderDefinition } from '../../game'
import { withBase } from '../../utils/assets'
import styles from './FinishingBlow.module.css'

/** Duración de la escena antes de lanzar el golpe. Debe casar con el CSS. */
export const FINISHING_BLOW_MS = 2200

/**
 * Golpe de gracia: al pulsar «Rematar», el comandante entra en grande desde
 * su lado, un tajo de luz cruza la pantalla y estalla «¡Golpe de gracia!».
 * Al terminar se lanza el ataque al Nexo de verdad (lo resuelve el motor como
 * cualquier otro ataque); la escena no decide nada.
 */
export function FinishingBlow({ commander, attackerName, onDone }: { commander: CommanderDefinition; attackerName: string; onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, FINISHING_BLOW_MS)
    return () => window.clearTimeout(timer)
  }, [onDone])
  return (
    <div className={styles.scene} style={{ '--accent': FACTION_BY_ID[commander.faction].accentColor } as CSSProperties} role="status" aria-live="assertive">
      <span className={styles.darken} aria-hidden="true" />
      <img className={styles.commander} src={withBase(commander.art.webp)} alt="" />
      <span className={styles.slash} aria-hidden="true" />
      <span className={styles.flash} aria-hidden="true" />
      <div className={styles.title}>
        <small>{commander.name} ordena</small>
        <strong>¡Golpe de gracia!</strong>
        <span>{attackerName} va a por el Nexo</span>
      </div>
    </div>
  )
}
