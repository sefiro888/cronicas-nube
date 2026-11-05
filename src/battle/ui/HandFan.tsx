import { memo } from 'react'
import type { CSSProperties } from 'react'
import { Card } from '../../components'
import { CARD_BY_ID, canPlayHandCard, handCardBlockReason, handCardCost, planManaPayment, type MatchState, type PlayerId } from '../../game'
import styles from './HandFan.module.css'

interface HandFanProps {
  readonly match: MatchState
  readonly reducedMotion?: boolean
  /** Bando de la partida que controla este navegador: 'player' en solitario y para el anfitrión, 'ai' para el invitado. */
  readonly localPlayerId: PlayerId
  readonly selectedHandId?: string
  readonly onSelect: (instanceId: string) => void
  readonly onInspect: (cardId: string, instanceId: string) => void
  /** Empieza a arrastrar esta carta hacia el tablero. */
  readonly onDragStart?: (instanceId: string, event: React.PointerEvent) => void
  /** Carta que se está arrastrando: se atenúa en el abanico mientras vuela. */
  readonly draggingId?: string
  /** Cartas fijadas: se muestran primero en el abanico, en su mismo orden relativo. */
  readonly favoriteIds?: ReadonlySet<string>
  readonly onToggleFavorite?: (instanceId: string) => void
}

/**
 * Mano en abanico del jugador. Memoizada: solo se vuelve a renderizar cuando
 * cambia la partida o la selección, no en cada evento visual de la cola.
 */
export const HandFan = memo(function HandFan({ match, reducedMotion, localPlayerId, selectedHandId, onSelect, onInspect, onDragStart, draggingId, favoriteIds, onToggleFavorite }: HandFanProps) {
  const player = match.players[localPlayerId]
  const count = player.hand.length
  // Las cartas fijadas van primero, conservando su orden relativo entre sí
  // (Array.prototype.sort es estable): es solo un reordenamiento visual, no
  // afecta a la partida — la mano real (`player.hand`) no cambia.
  const orderedHand = favoriteIds?.size
    ? [...player.hand].sort((a, b) => Number(favoriteIds.has(b.instanceId)) - Number(favoriteIds.has(a.instanceId)))
    : player.hand
  // El solape y la rotación se comprimen con la mano llena para que el abanico
  // no invada el tablero ni se salga del carril inferior.
  // Con diez cartas, 50 px por lado tapaban incluso el centro pulsable de
  // la siguiente carta. Hasta doce todavía caben con un centro descubierto.
  const overlap = count <= 4 ? 20 : count <= 6 ? 32 : count <= 12 ? 40 : 50
  const dense = count >= 9
  const maxRotation = dense ? 0.75 : Math.min(3.4, 20 / Math.max(1, count))
  const liftStep = dense ? 0.48 : Math.min(3.6, 20 / Math.max(1, count))
  return (
    <div className={styles.handViewport} data-testid="hand-scroll-rail">
    <div className={styles.hand} style={{ '--fan-count': count } as CSSProperties} aria-label="Tu mano" data-full-hand={dense || undefined} data-reduced-motion={reducedMotion || undefined}>
      {orderedHand.map((instance, index) => {
        const card = CARD_BY_ID[instance.cardId]
        if (!card) return null
        const cost = handCardCost(match, localPlayerId, card, instance)
        const affordable = planManaPayment(player.resources, cost).payable
        const playable = canPlayHandCard(match, localPlayerId, card, instance)
        const selected = selectedHandId === instance.instanceId
        const offset = index - (count - 1) / 2
        const style = {
          '--fan-rotation': `${offset * maxRotation}deg`,
          '--fan-lift': `${offset * offset * liftStep}px`,
          '--fan-overlap': `${-overlap}px`,
          zIndex: selected ? 40 : 10 + index,
        } as CSSProperties
        return (
          <div
            key={instance.instanceId}
            className={styles.fanCard}
            style={style}
            data-selected={selected}
            data-playable={playable}
            data-dragging={draggingId === instance.instanceId || undefined}
            title={handCardBlockReason(match, localPlayerId, card, instance) ?? 'Lista para jugar. Selecciona esta carta.'}
            onPointerDown={(event) => { if (playable) onDragStart?.(instance.instanceId, event) }}
            // El hueco fijo de la carta también la selecciona: al levantarse por
            // encima, la parte de abajo de su hueco queda libre y antes ese clic
            // se perdía (o caía en la carta vecina).
            onClick={(event) => { if (event.target === event.currentTarget) onSelect(instance.instanceId) }}
          >
            {/* Solo esta capa se levanta al pasar el ratón; el hueco (.fanCard)
                no se mueve, así la zona pulsable es estable y el puntero no
                acaba encima de la carta de al lado. */}
            <div className={styles.lift}>
              <Card
                card={card}
                size="hand"
                reducedMotion={reducedMotion}
                selected={selected}
                playable={playable}
                cost={cost}
                affordable={affordable}
                onSelect={() => onSelect(instance.instanceId)}
                onInspect={() => onInspect(card.id, instance.instanceId)}
              />
            </div>
            {onToggleFavorite && (
              <button
                type="button"
                className={styles.favoriteToggle}
                data-favorite={favoriteIds?.has(instance.instanceId) || undefined}
                aria-pressed={favoriteIds?.has(instance.instanceId) ?? false}
                aria-label={favoriteIds?.has(instance.instanceId) ? `Dejar de fijar ${card.name}` : `Fijar ${card.name} al principio de la mano`}
                title="Fijar al principio de la mano"
                onClick={(event) => { event.stopPropagation(); onToggleFavorite(instance.instanceId) }}
                onPointerDown={(event) => event.stopPropagation()}
              >
                {favoriteIds?.has(instance.instanceId) ? '★' : '☆'}
              </button>
            )}
          </div>
        )
      })}
    </div>
    </div>
  )
})
