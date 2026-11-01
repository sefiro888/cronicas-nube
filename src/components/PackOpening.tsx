import { useEffect, useState, type CSSProperties } from 'react'
import { Card } from './Card'
import { RARITY_LABELS } from './RarityGem'
import { CARD_BY_ID } from '../game'
import { useCollection, type PackCard } from '../store/collection'
import styles from './PackOpening.module.css'

/**
 * Apertura de un sobre, en tres tiempos:
 *
 * 1. El sobre sellado flota y brilla; al pulsarlo se rasga por arriba con un
 *    estallido de luz.
 * 2. Las cinco cartas salen boca abajo en abanico. Cada una se voltea al
 *    pulsarla (o todas con «Voltear todas»): la rara con un destello azul y
 *    la mítica con un rayo, sacudida y rayos de luz. Las doradas brillan y
 *    las nuevas llevan su rótulo.
 * 3. Resumen y vuelta al álbum.
 */
type Stage = 'sealed' | 'tearing' | 'cards'

export function PackOpening({ onClose }: { onClose: () => void }) {
  const openPack = useCollection((state) => state.openPack)
  const packs = useCollection((state) => state.packs)
  const [stage, setStage] = useState<Stage>('sealed')
  const [cards, setCards] = useState<readonly PackCard[]>([])
  const [flipped, setFlipped] = useState<ReadonlySet<number>>(new Set())
  const [strike, setStrike] = useState(0)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const tear = () => {
    if (stage !== 'sealed') return
    const result = openPack(Date.now())
    if (!result) return
    setCards(result)
    setStage('tearing')
    window.setTimeout(() => setStage('cards'), 1100)
  }

  const flip = (index: number) => {
    if (flipped.has(index)) return
    setFlipped((current) => new Set([...current, index]))
    const card = CARD_BY_ID[cards[index]!.cardId]
    if (card?.rarity === 'mythic') setStrike((value) => value + 1)
  }

  const flipAll = () => cards.forEach((_, index) => window.setTimeout(() => flip(index), index * 260))
  const allFlipped = cards.length > 0 && flipped.size === cards.length

  return (
    <div className={styles.overlay} role="dialog" aria-label="Abrir sobre" data-stage={stage}>
      {strike > 0 && <span key={strike} className={styles.lightning} aria-hidden="true" />}
      <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar">✕</button>

      {stage !== 'cards' && (
        <button type="button" className={styles.pack} onClick={tear} data-tearing={stage === 'tearing' || undefined} aria-label="Rasgar el sobre">
          <span className={styles.packTop} aria-hidden="true" />
          <span className={styles.packBody} aria-hidden="true">
            <span className={styles.packSigil}>✦</span>
            <strong>Sobre del Nexo</strong>
            <small>5 cartas</small>
          </span>
          <span className={styles.burst} aria-hidden="true" />
        </button>
      )}
      {stage === 'sealed' && <p className={styles.hint}>Pulsa el sobre para rasgarlo</p>}

      {stage === 'cards' && (
        <>
          <div className={styles.fan}>
            {cards.map((entry, index) => {
              const card = CARD_BY_ID[entry.cardId]
              if (!card) return null
              const isFlipped = flipped.has(index)
              return (
                <button
                  type="button"
                  key={index}
                  className={styles.slot}
                  data-flipped={isFlipped || undefined}
                  data-rarity={card.rarity}
                  data-foil={entry.foil || undefined}
                  style={{ '--i': index, '--n': cards.length } as CSSProperties}
                  onClick={() => flip(index)}
                  aria-label={isFlipped ? `${card.name}, ${RARITY_LABELS[card.rarity]}${entry.foil ? ', dorada' : ''}` : `Carta ${index + 1} boca abajo`}
                >
                  <span className={styles.inner}>
                    <span className={styles.back} aria-hidden="true"><span>✦</span></span>
                    <span className={styles.front}>
                      <Card card={card} size="hand" reducedMotion={false} />
                      {entry.foil && <span className={styles.foilSheen} aria-hidden="true" />}
                    </span>
                  </span>
                  {isFlipped && <span className={styles.reveal} aria-hidden="true" />}
                  {isFlipped && entry.isNew && <span className={styles.newTag}>¡Nueva!</span>}
                  {isFlipped && entry.foil && <span className={styles.foilTag}>Dorada</span>}
                </button>
              )
            })}
          </div>
          <div className={styles.actions}>
            {!allFlipped && <button type="button" onClick={flipAll}>Voltear todas</button>}
            {allFlipped && packs > 0 && (
              <button type="button" onClick={() => { setStage('sealed'); setCards([]); setFlipped(new Set()) }}>
                Abrir otro ({packs})
              </button>
            )}
            {allFlipped && <button type="button" onClick={onClose}>Al álbum</button>}
          </div>
        </>
      )}
    </div>
  )
}
