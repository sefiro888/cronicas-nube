import { useMemo, useRef, useState } from 'react'
import { Card, FACTION_LABELS, RARITY_LABELS } from '../components'
import { PackOpening } from '../components/PackOpening'
import { ProfileShowcase } from '../components/ProfileShowcase'
import { withBase } from '../utils/assets'
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
  const openButton = useRef<HTMLButtonElement>(null)
  const [faction, setFaction] = useState<FactionId | 'all'>('all')
  const [page, setPage] = useState(0)
  const [ownedOnly, setOwnedOnly] = useState(false)
  const progress = collectionProgress(owned)
  const cards = useMemo(
    () =>
      Object.values(CARD_BY_ID)
        .filter((card) => card.type !== 'mana' && card.unlocked !== false)
        .filter((card) => faction === 'all' || card.faction === faction)
        .sort(
          (a, b) =>
            RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity) ||
            a.name.localeCompare(b.name, 'es'),
        ),
    [faction],
  )
  const byRarity = RARITIES.map((rarity) => {
    const pool = Object.values(CARD_BY_ID).filter(
      (card) => card.type !== 'mana' && card.unlocked !== false && card.rarity === rarity,
    )
    return { rarity, have: pool.filter((card) => owned[card.id]).length, total: pool.length }
  })
  const filtered = ownedOnly ? cards.filter((card) => owned[card.id]) : cards
  const pageCount = Math.max(1, Math.ceil(filtered.length / 48))
  const currentPage = Math.min(page, pageCount - 1)

  return (
    <>
      <div className={styles.page} inert={opening || undefined}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Colección</p>
            <h1 tabIndex={-1}>Álbum del Nexo</h1>
            <p className={styles.lead}>
              Cada victoria te da un sobre. Lo que sale se queda aquí para siempre.
            </p>
            <div
              className={styles.progress}
              aria-label={`${progress.have} de ${progress.total} cartas`}
            >
              <span style={{ width: `${(progress.have / Math.max(1, progress.total)) * 100}%` }} />
              <strong>
                {progress.have} / {progress.total}
              </strong>
            </div>
            <ul className={styles.rarities}>
              {byRarity.map((entry) => (
                <li key={entry.rarity} data-rarity={entry.rarity}>
                  {RARITY_LABELS[entry.rarity]}{' '}
                  <b>
                    {entry.have}/{entry.total}
                  </b>
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.packBox} data-ready={packs > 0 || undefined}>
            <img
              className={styles.packIcon}
              src={withBase('assets/interface/sobre-nexo-v1.webp')}
              alt=""
            />
            <strong>
              {packs} {packs === 1 ? 'sobre' : 'sobres'}
            </strong>
            <button
              ref={openButton}
              type="button"
              disabled={packs <= 0}
              onClick={() => setOpening(true)}
            >
              {packs > 0 ? 'Abrir sobre' : 'Gana partidas para conseguir sobres'}
            </button>
          </div>
        </header>

        <ProfileShowcase />

        <label className={styles.filter}>
          Facción
          <select
            value={faction}
            onChange={(event) => {
              setFaction(event.target.value as FactionId | 'all')
              setPage(0)
            }}
          >
            <option value="all">Todas</option>
            {FACTION_IDS.map((id) => (
              <option key={id} value={id}>
                {FACTION_LABELS[id]}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.shelfTools}>
          <label>
            <input
              type="checkbox"
              checked={ownedOnly}
              onChange={(event) => {
                setOwnedOnly(event.target.checked)
                setPage(0)
              }}
            />{' '}
            Solo mis cartas
          </label>
          <span>
            {filtered.length} cartas · Página {currentPage + 1} de {pageCount}
          </span>
        </div>

        <ul className={styles.grid}>
          {filtered.slice(currentPage * 48, (currentPage + 1) * 48).map((card) => {
            const entry = owned[card.id]
            return (
              <li
                key={card.id}
                className={styles.cell}
                data-owned={entry ? true : undefined}
                data-foil={entry?.foils ? true : undefined}
              >
                <Card card={card} size="thumbnail" reducedMotion={!entry} />
                {entry && <span className={styles.count}>×{entry.count}</span>}
                {entry && entry.foils > 0 && (
                  <span
                    className={styles.foil}
                    title={`${entry.foils} dorada${entry.foils > 1 ? 's' : ''}`}
                  >
                    ★ {entry.foils}
                  </span>
                )}
                {!entry && <span className={styles.missing}>Por descubrir</span>}
              </li>
            )
          })}
        </ul>
        {filtered.length === 0 && (
          <p className={styles.empty}>
            Aquí comenzará tu historia. Abre un sobre para descubrir tus primeras cartas.
          </p>
        )}
        <nav className={styles.pagination} aria-label="Páginas del álbum">
          <button
            type="button"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            ← Anterior
          </button>
          <span>
            {currentPage + 1} / {pageCount}
          </span>
          <button
            type="button"
            disabled={currentPage + 1 >= pageCount}
            onClick={() => setPage(currentPage + 1)}
          >
            Siguiente →
          </button>
        </nav>
      </div>
      {opening && (
        <PackOpening
          onClose={() => {
            setOpening(false)
            window.requestAnimationFrame(() => {
              if (openButton.current?.disabled)
                openButton.current
                  .closest<HTMLElement>('header')
                  ?.querySelector<HTMLElement>('h1')
                  ?.focus()
              else openButton.current?.focus()
            })
          }}
        />
      )}
    </>
  )
}
