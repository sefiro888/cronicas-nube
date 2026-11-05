import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useReducedMotion } from 'framer-motion'
import { Card } from './Card'
import { CardInspector } from './CardInspector'
import { RARITY_LABELS } from './RarityGem'
import { FACTION_LABELS } from './FactionSigil'
import { CARD_BY_ID } from '../game'
import { useCollection, type PackCard } from '../store/collection'
import { usePreferences } from '../store/preferences'
import { playSynthCue, resumeAudio } from '../services/audio'
import styles from './PackOpening.module.css'

type Stage = 'sealed' | 'tearing' | 'cards'

export function PackOpening({ onClose }: { onClose: () => void }) {
  const openPack = useCollection((state) => state.openPack)
  const packs = useCollection((state) => state.packs)
  const preference = usePreferences((state) => state.reducedMotion)
  const systemReducedMotion = useReducedMotion()
  const reducedMotion = preference || Boolean(systemReducedMotion)
  const [stage, setStage] = useState<Stage>('sealed')
  const [cards, setCards] = useState<readonly PackCard[]>([])
  const [flipped, setFlipped] = useState<ReadonlySet<number>>(new Set())
  const [revealingAll, setRevealingAll] = useState(false)
  const [inspected, setInspected] = useState<number | null>(null)
  const dialog = useRef<HTMLDivElement>(null)
  const pending = useRef<number[]>([])
  // Un doble clic nunca debe consumir otro sobre ni repetir un sonido.
  const openingLock = useRef(false)
  const revealed = useRef(new Set<number>())
  const later = (action: () => void, delay: number) =>
    pending.current.push(window.setTimeout(action, delay))
  const closeInspection = useCallback(() => {
    const index = inspected
    setInspected(null)
    window.requestAnimationFrame(() => {
      if (index === null) return
      const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>('[data-card-flip]')
      buttons?.item(index).focus()
    })
  }, [inspected])

  useEffect(() => {
    const previous = document.activeElement
    const timers = pending.current
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.focus()
    return () => {
      timers.forEach(window.clearTimeout)
      document.body.style.overflow = overflow
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [])
  useEffect(() => {
    if (stage === 'cards')
      dialog.current?.querySelector<HTMLButtonElement>('[data-card-flip]')?.focus()
  }, [stage])

  const tear = (seed: number) => {
    if (openingLock.current) return
    openingLock.current = true
    const result = openPack(seed)
    if (!result) {
      openingLock.current = false
      return
    }
    resumeAudio()
    playSynthCue('summon')
    // El botón queda desactivado durante el rasgado; el diálogo conserva Esc.
    dialog.current?.focus()
    setCards(result)
    setStage('tearing')
    later(() => setStage('cards'), reducedMotion ? 0 : 1100)
  }
  const flip = (index: number) => {
    if (revealed.current.has(index)) return
    revealed.current.add(index)
    setFlipped(new Set(revealed.current))
    const card = CARD_BY_ID[cards[index]!.cardId]
    resumeAudio()
    playSynthCue(
      card?.rarity === 'mythic' ? 'victory' : card?.rarity === 'rare' ? 'spotlight' : 'reveal',
    )
  }
  const flipAll = () => {
    if (revealingAll) return
    setRevealingAll(true)
    cards.forEach((_, index) => later(() => flip(index), reducedMotion ? 0 : index * 300))
  }
  const allFlipped = cards.length > 0 && flipped.size === cards.length
  const newCount = cards.filter((entry) => entry.isNew).length
  const foilCount = cards.filter((entry) => entry.foil).length

  return (
    <>
      <div
        ref={dialog}
        inert={inspected !== null || undefined}
        className={styles.overlay}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pack-title"
        tabIndex={-1}
        data-stage={stage}
        data-reduced-motion={reducedMotion || undefined}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation()
            onClose()
          }
          if (event.key !== 'Tab') return
          const buttons = Array.from(
            dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [],
          )
          const first = buttons[0]
          const last = buttons.at(-1)
          if (
            event.shiftKey &&
            (document.activeElement === first || document.activeElement === dialog.current)
          ) {
            event.preventDefault()
            last?.focus()
          } else if (
            !event.shiftKey &&
            (document.activeElement === last || document.activeElement === dialog.current)
          ) {
            event.preventDefault()
            first?.focus()
          }
        }}
      >
        <div className={styles.ambience} aria-hidden="true" />
        <header className={styles.heading}>
          <span>Crónicas del Nexo · Cámara de los ecos</span>
          <h2 id="pack-title">
            {stage === 'cards'
              ? allFlipped
                ? 'El Nexo ha hablado'
                : 'Cinco destinos por descubrir'
              : 'Un fragmento de otros mundos'}
          </h2>
          <p>
            {stage === 'cards'
              ? 'Cada carta guarda una historia. Descubre la tuya.'
              : 'Rompe el sello y despierta las historias que aguardan dentro.'}
          </p>
        </header>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar">
          ✕
        </button>
        {stage !== 'cards' && (
          <div className={styles.altar}>
            <span className={styles.orbit} aria-hidden="true" />
            <button
              type="button"
              className={styles.pack}
              onClick={(event) => tear(Math.floor(event.timeStamp * 1000))}
              disabled={stage === 'tearing'}
              data-tearing={stage === 'tearing' || undefined}
              aria-label="Rasgar el sobre"
            >
              <span className={styles.packTop} aria-hidden="true" />
              <span className={styles.packBody} aria-hidden="true">
                <strong>Sobre del Nexo</strong>
                <small>5 cartas · una historia que continúa</small>
              </span>
              <span className={styles.burst} aria-hidden="true" />
            </button>
          </div>
        )}
        {stage === 'sealed' && (
          <div className={styles.instructions}>
            <p>✧ Pulsa el sobre para romper el sello ✧</p>
            <small>5 cartas para tu colección · al menos una rara o mítica</small>
          </div>
        )}
        {stage === 'cards' && (
          <>
            <div className={styles.fan}>
              {cards.map((entry, index) => {
                const card = CARD_BY_ID[entry.cardId]
                if (!card) return null
                const isFlipped = flipped.has(index)
                return (
                  <div
                    key={index}
                    className={styles.slot}
                    data-flipped={isFlipped || undefined}
                    data-rarity={isFlipped ? card.rarity : undefined}
                    data-foil={(isFlipped && entry.foil) || undefined}
                    style={{ '--i': index } as CSSProperties}
                  >
                    <button
                      type="button"
                      className={styles.flipButton}
                      data-card-flip
                      onClick={() => (isFlipped ? setInspected(index) : flip(index))}
                      aria-label={
                        isFlipped
                          ? `Examinar ${card.name}, ${RARITY_LABELS[card.rarity]}${entry.foil ? ', dorada' : ''}`
                          : `Carta ${index + 1} boca abajo`
                      }
                    >
                      <span className={styles.inner}>
                        <span className={styles.back} aria-hidden="true">
                          <span>Crónicas del Nexo</span>
                        </span>
                        <span className={styles.front} aria-hidden={!isFlipped}>
                          <Card card={card} size="hand" reducedMotion={reducedMotion} />
                          {entry.foil && <span className={styles.foilSheen} aria-hidden="true" />}
                        </span>
                      </span>
                      {isFlipped && <span className={styles.reveal} aria-hidden="true" />}
                      {isFlipped && entry.isNew && <span className={styles.newTag}>¡Nueva!</span>}
                    </button>
                    <div className={styles.caption}>
                      <span>
                        {isFlipped
                          ? `${RARITY_LABELS[card.rarity]}${entry.foil ? ' · Dorada' : ''}`
                          : `ECO ${String(index + 1).padStart(2, '0')}`}
                      </span>
                      <strong>{isFlipped ? card.name : 'Por descubrir'}</strong>
                      <small>
                        {isFlipped
                          ? `${FACTION_LABELS[card.faction]} · Pulsa para examinar`
                          : 'Pulsa para revelar'}
                      </small>
                    </div>
                  </div>
                )
              })}
            </div>
            <footer className={styles.actions}>
              <p role="status" aria-live="polite">
                {allFlipped
                  ? `${newCount} ${newCount === 1 ? 'nueva' : 'nuevas'} · ${foilCount} ${foilCount === 1 ? 'dorada' : 'doradas'} · 5 cartas guardadas en tu álbum`
                  : `${flipped.size} de 5 cartas reveladas`}
              </p>
              <div>
                {!allFlipped && (
                  <button type="button" onClick={flipAll} disabled={revealingAll}>
                    Voltear todas
                  </button>
                )}
                {allFlipped && packs > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      openingLock.current = false
                      revealed.current.clear()
                      setStage('sealed')
                      setCards([])
                      setFlipped(new Set())
                      setRevealingAll(false)
                    }}
                  >
                    Abrir otro ({packs})
                  </button>
                )}
                {allFlipped && (
                  <button type="button" onClick={onClose}>
                    Al álbum
                  </button>
                )}
              </div>
              <small>Tu colección se guarda al abrir el sobre.</small>
            </footer>
          </>
        )}
      </div>
      {inspected !== null && (
        <CardInspector card={CARD_BY_ID[cards[inspected]!.cardId]!} onClose={closeInspection} />
      )}
    </>
  )
}
