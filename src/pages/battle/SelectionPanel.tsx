import type { CardDefinition, ManaCost } from '../../game'
import { formatManaCost } from '../../components'
import { withBase } from '../../utils/assets'
import { FACTION_LABELS, RARITY_LABELS, TYPE_LABELS } from '../../utils/cardLabels'
import { BATTLE_KEYWORD_LABELS } from './labels'
import styles from '../BattlePage.module.css'

interface SelectionPanelProps {
  /** Carta o ficha que se está mostrando: consultada, seleccionada de la mano o del tablero. */
  card?: CardDefinition
  /** Coste de la copia seleccionada, con los descuentos de esta partida. */
  cost?: ManaCost
  /** Encabezado del panel: cambia según de dónde venga la carta mostrada. */
  heading: string
  /** Línea de ATQ/VID/ALC/MOV, ya compuesta por el llamante. */
  stats?: string
  /** Qué puede hacer el jugador ahora mismo con esta selección. */
  hint?: string
  /** Hechizo sin objetivo y pagable: se puede lanzar directamente desde aquí. */
  canCast: boolean
  onCast: () => void
  /**
   * Duna — Ofrenda: solo llega si la carta elegida pide una. Es una decisión
   * que hay que tomar ANTES de resolver la carta, así que vive aquí, junto al
   * texto que explica qué se gana pagándola.
   */
  offering?: {
    readonly cost: number
    readonly paying: boolean
    readonly affordable: boolean
    readonly onToggle: () => void
  }
}

/** Panel lateral derecho: detalle de la carta o unidad activa y la guía de acción. */
export function SelectionPanel({ card, cost, heading, stats, hint, canCast, onCast, offering }: SelectionPanelProps) {
  return (
    <section className={`${styles.panelSection} ${styles.context}`} data-empty={!card || undefined}>
      <span className={styles.panelLabel}>{heading}</span>
      {card && (
        <>
          <div className={styles.contextArt}>
            <img src={withBase(card.art.webp)} alt="" loading="lazy" />
          </div>
          <h3>{card.name}</h3>
          <p className={styles.contextType}>
            {FACTION_LABELS[card.faction]} · {TYPE_LABELS[card.type]}{card.subtype ? ` — ${card.subtype}` : ''} · {RARITY_LABELS[card.rarity]}
          </p>
          <p className={styles.contextCost}>Coste: {formatManaCost(cost ?? card.cost)}</p>
          {stats && <p className={styles.contextStats}>{stats.split(' · ').map((part) => <span key={part}>{part}</span>)}</p>}
          <p className={styles.contextRules}>{card.rules}</p>
          {card.keywords.length > 0 && (
            <div className={styles.contextKeywords}>
              {card.keywords.map((keyword) => (
                <span key={keyword}>{BATTLE_KEYWORD_LABELS[keyword] ?? keyword}</span>
              ))}
            </div>
          )}
          <p className={styles.contextFlavor}>«{card.flavor}»</p>
        </>
      )}
      {offering && (
        <button
          className={styles.offering}
          type="button"
          data-paying={offering.paying || undefined}
          onClick={offering.onToggle}
          disabled={!offering.affordable}
          aria-pressed={offering.paying}
          title={
            offering.affordable
              ? 'La Ofrenda se paga con la Vida de tu propio Nexo al jugar la carta.'
              : 'No te queda Vida suficiente para pagar esta Ofrenda.'
          }
        >
          <span>{offering.paying ? '◆ Ofrendarás' : '◇ Ofrendar'}</span>
          <small>{offering.affordable ? `${offering.cost} de Vida` : 'sin Vida suficiente'}</small>
        </button>
      )}
      {hint && (
        <p key={hint} className={styles.actionHint} data-warning={hint.startsWith('No tienes') || undefined} role="status">
          {hint}
        </p>
      )}
      {canCast && (
        <button className={styles.cast} onClick={onCast} title="Lanza este hechizo, que no necesita objetivo en el tablero.">
          Resolver carta
        </button>
      )}
    </section>
  )
}
