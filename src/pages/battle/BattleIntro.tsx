import { useEffect, type CSSProperties } from 'react'
import { FACTION_BY_ID, type CommanderDefinition } from '../../game'
import { withBase } from '../../utils/assets'
import styles from './BattleIntro.module.css'

/** Cuánto dura la presentación antes de cerrarse sola. Debe casar con el CSS. */
export const BATTLE_INTRO_MS = 3600

/**
 * Presentación al empezar la batalla: los dos comandantes cara a cara, cada
 * uno desde su lado, con su frase y un «VS» que estalla en medio, como en un
 * juego de lucha. Se puede saltar con un clic o con Espacio.
 */
export function BattleIntro({ own, rival, onDone }: { own: CommanderDefinition; rival: CommanderDefinition; onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, BATTLE_INTRO_MS)
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== ' ' && event.key !== 'Enter' && event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      onDone()
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [onDone])

  const side = (commander: CommanderDefinition, which: 'own' | 'rival') => (
    <div className={styles.side} data-side={which} style={{ '--accent': FACTION_BY_ID[commander.faction].accentColor } as CSSProperties}>
      <img src={withBase(commander.art.webp)} alt="" />
      <div className={styles.plate}>
        <small>{which === 'own' ? 'Tu comandante' : 'Comandante rival'}</small>
        <strong>{commander.name}</strong>
        <span>{commander.title}</span>
        <q>{commander.flavor}</q>
      </div>
    </div>
  )

  return (
    <div className={styles.intro} onClick={onDone} role="dialog" aria-label={`${own.name} contra ${rival.name}`} data-testid="battle-intro">
      {side(own, 'own')}
      {side(rival, 'rival')}
      <span className={styles.split} aria-hidden="true" />
      <span className={styles.versus} aria-hidden="true">VS</span>
      <span className={styles.hint}>Clic o Espacio para empezar</span>
    </div>
  )
}
