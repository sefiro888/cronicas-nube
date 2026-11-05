import { useEffect, useId, useRef, type KeyboardEvent } from 'react'
import { CARD_BY_ID, type CardInstance, type CommanderDefinition } from '../../game'
import type { ScenarioId } from '../../store/preferences'
import { withBase } from '../../utils/assets'
import { CommanderDuel } from './CommanderDuel'
import styles from '../BattlePage.module.css'
import presentation from './MulliganPresentation.module.css'

interface MulliganDialogProps {
  hand: readonly CardInstance[]
  /** Cartas marcadas para cambiar. */
  selectedIds: readonly string[]
  onToggle: (instanceId: string) => void
  onConfirm: () => void
  ownCommander?: CommanderDefinition
  rivalCommander?: CommanderDefinition
  scenario: Exclude<ScenarioId, 'auto'>
  reducedMotion: boolean
}

/**
 * Mano de salida: deja cambiar cartas una sola vez antes de empezar.
 *
 * La pista de fuentes es el consejo más útil del juego para quien empieza:
 * casi todas las manos malas lo son por tener demasiadas o muy pocas.
 */
export function MulliganDialog({ hand, selectedIds, onToggle, onConfirm, ownCommander, rivalCommander, scenario, reducedMotion }: MulliganDialogProps) {
  const titleId = useId()
  const dialog = useRef<HTMLElement>(null)
  const firstCard = useRef<HTMLButtonElement>(null)
  const confirm = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const frame = requestAnimationFrame(() => (firstCard.current ?? confirm.current)?.focus({ preventScroll: true }))
    return () => {
      cancelAnimationFrame(frame)
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [])
  const keepFocus = (event: KeyboardEvent<HTMLElement>) => {
    // E/H/I pertenecen al campo. La preparación mantiene su propio foco y
    // no debe ocultar la mano ni ceder el turno que queda detrás del diálogo.
    event.stopPropagation()
    if (event.key !== 'Tab') return
    const controls = dialog.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])')
    const first = controls?.[0]
    const last = controls?.[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }
  const sources = hand.filter((instance) => CARD_BY_ID[instance.cardId]?.type === 'mana').length
  const balanced = sources >= 3 && sources <= 5

  return (
    <div className={styles.resultBackdrop}>
      <section ref={dialog} className={`${styles.mulligan} ${presentation.prepared}`} role="dialog" aria-modal="true"
        aria-labelledby={titleId} onKeyDown={keepFocus}>
        {ownCommander && rivalCommander && <CommanderDuel own={ownCommander} opponent={rivalCommander}
          scenario={scenario} reducedMotion={reducedMotion} />}
        <small>Preparación de la crónica</small>
        <h2 id={titleId}>Tu mano inicial</h2>
        <p className={presentation.instruction}>
          El <strong>mulligan</strong> permite cambiar cartas una vez. Marca las que quieras devolver.
        </p>
        <p className={`${styles.mulliganHint} ${presentation.hint}`} data-ok={balanced}>
          Tienes <strong>{sources}</strong> {sources === 1 ? 'fuente' : 'fuentes'} de Esencia.
          {balanced
            ? ' Buen equilibrio para empezar.'
            : sources < 3
              ? ' Con menos de tres te costará pagar tus jugadas.'
              : ' Muchas fuentes: considera buscar unidades o hechizos.'}
        </p>
        <div className={`${styles.mulliganCards} ${presentation.cards}`}>
          {hand.map((instance, index) => {
            const card = CARD_BY_ID[instance.cardId]
            if (!card) return null
            const selected = selectedIds.includes(instance.instanceId)
            return (
              <button
                key={instance.instanceId}
                ref={index === 0 ? firstCard : undefined}
                className={`${styles.mulliganCard} ${presentation.card}`}
                data-selected={selected}
                aria-pressed={selected}
                onClick={() => onToggle(instance.instanceId)}
              >
                <img src={withBase(card.art.webp)} alt="" />
                <strong>{card.name}</strong>
                <span>{selected ? 'Cambiar' : 'Conservar'}</span>
              </button>
            )
          })}
        </div>
        <button ref={confirm} className={`${styles.confirmMulligan} ${presentation.confirm}`} onClick={onConfirm}>
          {selectedIds.length > 0 ? `Cambiar ${selectedIds.length} ${selectedIds.length === 1 ? 'carta' : 'cartas'}` : hand.length === 10 ? 'Conservar las diez' : `Conservar las ${hand.length} cartas`}
        </button>
      </section>
    </div>
  )
}
