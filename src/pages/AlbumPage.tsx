import { useMemo, useState } from 'react'
import { Card, FACTION_LABELS, RARITY_LABELS } from '../components'
import { PackOpening } from '../components/PackOpening'
import { ProfileShowcase } from '../components/ProfileShowcase'
import { CARD_BY_ID, FACTION_IDS, RARITIES, type FactionId } from '../game'
import { collectionProgress, useCollection } from '../store/collection'
import styles from './AlbumPage.module.css'

/**
 * Álbum de colección: lo que ha salido de los sobres, con cuántas copias y
 * cuántas doradas. Las cartas que aún no tienes se ven en silueta. Es una
 * colección para lucir: no limita qué se puede jugar (ver store/collection).
 */
export function AlbumPage() {
  const packs = useCollection((state) => state.packs)
  const owned = useCollection((state) => state.owned)
  const [opening, setOpening] = useState(false)
  const [faction, setFaction] = useState<FactionId | 'all'>('all')
  const progress = collectionProgress(owned)
  const cards = useMemo(() => Object.values(CARD_BY_ID)
    .filter((card) => card.type !== 'mana' && card.unlocked !== false)
    .filter((card) => faction === 'all' || card.faction === faction)
    .sort((a, b) => RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity) || a.name.localeCompare(b.name, 'es')), [faction])
  const byRarity = RARITIES.map((rarity) => {
    const pool = Object.values(CARD_BY_ID).filter((card) => card.type !== 'mana' && card.unlocked !== false && card.rarity === rarity)
    return { rarity, have: pool.filter((card) => owned[card.id]).length, total: pool.length }
  })

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Colección</p>
          <h1>Álbum del Nexo</h1>
          <p className={styles.lead}>Cada victoria te da un sobre. Lo que sale se queda aquí para siempre.</p>
          <div className={styles.progress} aria-label={`${progress.have} de ${progress.total} cartas`}>
            <span style={{ width: `${(progress.have / Math.max(1, progress.total)) * 100}%` }} />
            <strong>{progress.have} / {progress.total}</strong>
          </div>
          <ul className={styles.rarities}>
            {byRarity.map((entry) => (
              <li key={entry.rarity} data-rarity={entry.rarity}>{RARITY_LABELS[entry.rarity]} <b>{entry.have}/{entry.total}</b></li>
            ))}
          </ul>
        </div>
        <div className={styles.packBox} data-ready={packs > 0 || undefined}>
          <span className={styles.packIcon} aria-hidden="true">✦</span>
          <strong>{packs} {packs === 1 ? 'sobre' : 'sobres'}</strong>
          <button type="button" disabled={packs <= 0} onClick={() => setOpening(true)}>
            {packs > 0 ? 'Abrir sobre' : 'Gana partidas para conseguir sobres'}
          </button>
        </div>
      </header>

      <ProfileShowcase />

      <label className={styles.filter}>
        Facción
        <select value={faction} onChange={(event) => setFaction(event.target.value as FactionId | 'all')}>
          <option value="all">Todas</option>
          {FACTION_IDS.map((id) => <option key={id} value={id}>{FACTION_LABELS[id]}</option>)}
        </select>
      </label>

      <ul className={styles.grid}>
        {cards.map((card) => {
          const entry = owned[card.id]
          return (
            <li key={card.id} className={styles.cell} data-owned={entry ? true : undefined} data-foil={entry?.foils ? true : undefined}>
              <Card card={card} size="thumbnail" reducedMotion={!entry} />
              {entry && <span className={styles.count}>×{entry.count}</span>}
              {entry && entry.foils > 0 && <span className={styles.foil} title={`${entry.foils} dorada${entry.foils > 1 ? 's' : ''}`}>★ {entry.foils}</span>}
              {!entry && <span className={styles.missing}>Por descubrir</span>}
            </li>
          )
        })}
      </ul>

      {opening && <PackOpening onClose={() => setOpening(false)} />}
    </div>
  )
}
