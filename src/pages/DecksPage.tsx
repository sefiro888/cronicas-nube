import { useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { CARD_BY_ID, COMMANDER_BY_ID, FACTION_BY_ID, STARTER_DECKS, cardsForFaction, validateDeck } from '../game'
import type { DeckDefinition, DeckEntry } from '../game'
import { CardInspector } from '../components'
import { FactionSigil } from '../components/FactionSigil'
import { usePreferences } from '../store/preferences'
import { aiRecords, currentStreak, pvpRecords, summarizeByDeck, summarizeByOpponent, summarizeRecords, useRecords } from '../store/records'
import { evaluateAchievements } from '../store/achievements'
import { withBase } from '../utils/assets'
import { decodeDeckCode, encodeDeckCode } from '../utils/deckCode'
import styles from './DecksPage.module.css'

function loadEntries(deck: DeckDefinition): DeckEntry[] {
  const raw = localStorage.getItem(`cronicas-nexo-deck-${deck.id}`)
  if (!raw) return deck.cards.map((entry) => ({ ...entry }))
  try {
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value)) return deck.cards.map((entry) => ({ ...entry }))
    return value.filter((entry): entry is DeckEntry => typeof entry === 'object' && entry !== null && 'cardId' in entry && 'count' in entry)
  } catch {
    return deck.cards.map((entry) => ({ ...entry }))
  }
}

export function DecksPage() {
  const preferences = usePreferences()
  const selected = STARTER_DECKS.find((deck) => deck.id === preferences.selectedDeckId) ?? STARTER_DECKS[0]
  if (!selected) return null
  return <DeckEditor key={selected.id} selected={selected} selectDeck={preferences.setSelectedDeck} />
}

function DeckEditor({ selected, selectDeck }: { selected: DeckDefinition; selectDeck: (deckId: string) => void }) {
  const [entries, setEntries] = useState<DeckEntry[]>(() => loadEntries(selected))
  const [saved, setSaved] = useState(false)
  const [shareCode, setShareCode] = useState<string>()
  const [shareCopied, setShareCopied] = useState(false)
  const [importText, setImportText] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [importError, setImportError] = useState<string>()

  const draft = useMemo<DeckDefinition>(() => ({ ...selected, cards: entries }), [selected, entries])
  const validation = useMemo(() => validateDeck(draft), [draft])
  const commander = COMMANDER_BY_ID[selected.commanderId]
  // Cartas de acción (no fuentes) por coste total, de 0 a 6+.
  const curve = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0, 0, 0]
    for (const entry of entries) {
      const card = CARD_BY_ID[entry.cardId]
      if (!card || card.type === 'mana') continue
      const total = card.cost.generic + Object.values(card.cost.colored ?? {}).reduce((sum, value) => sum + (value ?? 0), 0)
      buckets[Math.min(6, total)]! += entry.count
    }
    return buckets
  }, [entries])

  // Catálogo de la facción que aún no está en el mazo: permite construir desde cero.
  const availablePool = useMemo(() => {
    const inDeck = new Set(entries.map((entry) => entry.cardId))
    return cardsForFaction(selected.faction).filter((card) => !inDeck.has(card.id))
  }, [entries, selected.faction])

  const changeCount = (cardId: string, delta: number) => {
    setSaved(false)
    setEntries((current) =>
      current
        .map((entry) => (entry.cardId === cardId ? { ...entry, count: Math.max(0, entry.count + delta) } : entry))
        // Al bajar a 0 la carta sale del mazo y vuelve al catálogo.
        .filter((entry) => entry.count > 0),
    )
  }
  /**
   * Carta abierta en el inspector. Antes, pulsar una carta del catálogo la
   * metía directamente en el mazo y no había forma de leerla: para eso está
   * el «+». Ahora el clic sobre la carta —dentro o fuera del mazo— muestra su
   * información, que es lo que uno espera al pulsar sobre una carta.
   */
  const [inspected, setInspected] = useState<string>()

  const addCard = (cardId: string) => {
    setSaved(false)
    setEntries((current) => (current.some((entry) => entry.cardId === cardId) ? current : [...current, { cardId, count: 1 }]))
  }
  const save = () => {
    localStorage.setItem(`cronicas-nexo-deck-${selected.id}`, JSON.stringify(entries))
    setSaved(true)
  }
  const reset = () => {
    localStorage.removeItem(`cronicas-nexo-deck-${selected.id}`)
    setEntries(selected.cards.map((entry) => ({ ...entry })))
    setSaved(false)
  }

  const share = () => {
    const code = encodeDeckCode(selected.id, entries)
    setShareCode(code)
    setShareCopied(false)
    navigator.clipboard?.writeText(code).then(
      () => setShareCopied(true),
      () => {
        /* Sin permiso de portapapeles: el código sigue visible para copiarlo a mano. */
      },
    )
  }

  const applyImport = () => {
    const decoded = decodeDeckCode(importText)
    if (!decoded) {
      setImportError('Ese texto no es un código de mazo válido.')
      return
    }
    if (decoded.deckId !== selected.id) {
      const owner = STARTER_DECKS.find((deck) => deck.id === decoded.deckId)
      setImportError(owner ? `Ese código es de «${owner.name}». Cambia primero a esa pestaña.` : 'Ese código pertenece a un mazo que no existe en este set.')
      return
    }
    const unknown = decoded.cards.filter((entry) => !CARD_BY_ID[entry.cardId])
    if (unknown.length === decoded.cards.length) {
      setImportError('Ninguna carta del código coincide con el set actual.')
      return
    }
    setEntries(decoded.cards.filter((entry) => CARD_BY_ID[entry.cardId]))
    setSaved(false)
    setImportError(undefined)
    setImportText('')
    setImportOpen(false)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div><small>Arsenal del Nexo</small><h1>Mazos iniciales</h1></div>
        <p className={styles.headerLead}>{STARTER_DECKS.length} mazos, uno por facción. Elige uno para ver y ajustar sus cartas.</p>
      </header>
      {/* Galería de mazos: retrato del comandante, color y sello de la
          facción. Sustituye a una fila de pestañas de texto donde los nombres
          se partían en cinco líneas y no se veía de qué facción era cada uno. */}
      <div className={styles.deckGallery} role="group" aria-label="Mazos">
        {STARTER_DECKS.map((deck) => {
          const deckCommander = COMMANDER_BY_ID[deck.commanderId]
          const accent = FACTION_BY_ID[deck.faction].accentColor
          return (
            <button
              key={deck.id}
              type="button"
              className={styles.deckBanner}
              data-active={deck.id === selected.id}
              aria-pressed={deck.id === selected.id}
              onClick={() => {
                selectDeck(deck.id)
                // Con 19 mazos la galería ocupa la pantalla: al elegir uno se
                // baja sola a su lista de cartas (tras volver a montarse).
                window.setTimeout(() => document.getElementById('editor-mazo')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
              }}
              style={{ '--accent': accent } as CSSProperties}
            >
              {deckCommander && <img src={withBase(deckCommander.art.webp)} alt="" loading="lazy" />}
              <span className={styles.bannerSigil}><FactionSigil faction={deck.faction} size="medium" decorative /></span>
              <span className={styles.bannerText}>
                <strong>{deck.name}</strong>
                <small>{deckCommander?.name}</small>
              </span>
            </button>
          )
        })}
      </div>
      <div className={styles.layout} id="editor-mazo">
        <aside className={styles.summary}>
          {/* Estandarte del mazo: el comandante en grande sobre el color de su facción. */}
          <div className={styles.summaryBanner} style={{ '--accent': FACTION_BY_ID[selected.faction].accentColor } as CSSProperties}>
            {commander && <img src={withBase(commander.art.webp)} alt="" />}
            <div className={styles.factionMark}><FactionSigil faction={selected.faction} size="large" decorative /></div>
          </div>
          <h2>{selected.name}</h2><div className={styles.commander}>{commander?.name} · {commander?.title}</div>
          <p className={styles.commanderRule}>{commander?.rules}</p>
          <div className={styles.stats}><div className={styles.stat}><strong>{validation.totalCards}</strong><span>Total</span></div><div className={styles.stat}><strong>{validation.manaCards}</strong><span>Esencia</span></div><div className={styles.stat}><strong>{validation.nonManaCards}</strong><span>Acción</span></div></div>
          {/* Curva de coste: cuántas cartas de acción hay por coste, para ver
              de un vistazo si el mazo arranca rápido o va a por el final. */}
          <div className={styles.curve} aria-label="Curva de coste">
            <small>Curva de coste</small>
            <div className={styles.curveBars}>
              {curve.map((count, cost) => (
                <span key={cost} className={styles.curveBar} title={`${count} cartas de coste ${cost === curve.length - 1 ? `${cost}+` : cost}`}>
                  <i style={{ height: `${(count / Math.max(1, ...curve)) * 100}%` }} />
                  <b>{count}</b>
                  <em>{cost === curve.length - 1 ? `${cost}+` : cost}</em>
                </span>
              ))}
            </div>
          </div>
          {validation.valid ? <div className={styles.valid}>✓ Mazo válido para jugar</div> : <div className={styles.invalid}>Mazo no válido<ul className={styles.issues}>{validation.issues.slice(0, 4).map((issue, index) => <li key={`${issue.code}-${index}`}>{issue.message}</li>)}</ul></div>}
          <div className={styles.saveRow}><button className={styles.save} onClick={save}>Guardar local</button><button className={styles.reset} onClick={reset}>Restaurar</button></div>
          {saved && <span className={styles.saved}>Borrador guardado en este dispositivo.</span>}

          <div className={styles.shareBlock}>
            <div className={styles.shareRow}>
              <button className={styles.shareButton} onClick={share}>Compartir código</button>
              <button className={styles.shareButton} onClick={() => setImportOpen((open) => !open)}>Importar código</button>
            </div>
            {shareCode && (
              <div className={styles.shareCode}>
                <code>{shareCode}</code>
                <span>{shareCopied ? 'Copiado al portapapeles.' : 'Cópialo y compártelo por chat.'}</span>
              </div>
            )}
            {importOpen && (
              <div className={styles.importBlock}>
                <textarea
                  className={styles.importInput}
                  value={importText}
                  onChange={(event) => { setImportText(event.target.value); setImportError(undefined) }}
                  placeholder="Pega aquí el código de un mazo de esta misma facción…"
                  rows={3}
                />
                <button className={styles.shareButton} onClick={applyImport} disabled={!importText.trim()}>Aplicar</button>
                {importError && <p className={styles.importError}>{importError}</p>}
              </div>
            )}
          </div>
        </aside>
        <section className={styles.editor}>
          <header className={styles.editorHeader}><h3>Lista de cartas</h3><span>Usa +/− para ajustar copias. Al llegar a 0, la carta vuelve al catálogo.</span></header>
          <div className={styles.list}>{entries.map((entry) => {
            const card = CARD_BY_ID[entry.cardId]
            if (!card) return null
            const colorCost = Object.values(card.cost.colored).reduce((total, amount) => total + (amount ?? 0), 0)
            return <article className={styles.entry} key={entry.cardId}>
              <button
                type="button"
                className={styles.entryInfo}
                onClick={() => setInspected(card.id)}
                aria-label={`Ver la ficha de ${card.name}`}
              >
                <img className={styles.art} src={withBase(card.art.webp)} alt="" />
                <div><h4>{card.name}</h4><p>{card.type} · {card.rarity}{card.unique ? ' · única' : ''}</p></div>
              </button>
              {/* Dos rótulos del mismo dato: en móvil no cabe «Coste 3» a la
                  derecha de cada fila, pero el coste es justo lo que hay que
                  mirar para montar un mazo. El corto es una chapa con el
                  número. */}
              <span className={styles.cost}>{card.type === 'mana' ? 'Fuente' : `Coste ${card.cost.generic + colorCost}`}</span>
              <span className={styles.costShort} aria-hidden="true">{card.type === 'mana' ? '◆' : card.cost.generic + colorCost}</span>
              <div className={styles.counter}><button onClick={() => changeCount(entry.cardId, -1)} aria-label={`Quitar ${card.name}`}>−</button><span>{entry.count}</span><button onClick={() => changeCount(entry.cardId, 1)} aria-label={`Añadir ${card.name}`}>+</button></div>
            </article>
          })}</div>
          {availablePool.length > 0 && (
            <>
              <header className={styles.editorHeader}><h3>Catálogo de {selected.faction === 'fury' ? 'Furia' : selected.name}</h3><span>Añade cartas de la facción para construir tu propio mazo</span></header>
              <div className={styles.pool}>{availablePool.map((card) => {
                const colorCost = Object.values(card.cost.colored).reduce((total, amount) => total + (amount ?? 0), 0)
                return (
                  <div className={styles.poolCard} key={card.id}>
                    <button
                      type="button"
                      className={styles.poolInfo}
                      onClick={() => setInspected(card.id)}
                      aria-label={`Ver la ficha de ${card.name}`}
                    >
                      <img className={styles.art} src={withBase(card.art.webp)} alt="" />
                      <div><h4>{card.name}</h4><p>{card.type} · {card.rarity}</p></div>
                      <span className={styles.cost}>{card.type === 'mana' ? 'Fuente' : `Coste ${card.cost.generic + colorCost}`}</span>
                      <span className={styles.costShort} aria-hidden="true">{card.type === 'mana' ? '◆' : card.cost.generic + colorCost}</span>
                    </button>
                    {/* Añadir es una acción aparte, con su propio botón: pulsar
                        la carta entera para meterla en el mazo hacía imposible
                        leerla antes de decidir. */}
                    <button
                      type="button"
                      className={styles.addMark}
                      onClick={() => addCard(card.id)}
                      aria-label={`Añadir ${card.name} al mazo`}
                      title={`Añadir ${card.name} al mazo`}
                    >
                      +
                    </button>
                  </div>
                )
              })}</div>
            </>
          )}
        </section>
      </div>
      <CardInspector card={(inspected && CARD_BY_ID[inspected]) || null} onClose={() => setInspected(undefined)} />
      <AchievementsPanel />
      <MatchHistory />
    </div>
  )
}

function AchievementsPanel() {
  const records = useRecords((state) => state.records)
  const achievements = useMemo(() => evaluateAchievements(records), [records])
  const unlocked = achievements.filter((achievement) => achievement.unlocked).length

  return (
    <section className={styles.history}>
      <header className={styles.historyHeader}>
        <h3>Logros</h3>
        <span className={styles.achieveCount}>{unlocked} / {achievements.length}</span>
      </header>
      <div className={styles.achievements}>
        {achievements.map((achievement) => (
          <article key={achievement.id} className={styles.achievement} data-unlocked={achievement.unlocked}>
            <span className={styles.achieveIcon} aria-hidden="true">{achievement.icon}</span>
            <div className={styles.achieveBody}>
              <h4>{achievement.name}</h4>
              <p>{achievement.description}</p>
              {!achievement.unlocked && achievement.progress > 0 && (
                <div className={styles.achieveBar}><span style={{ width: `${Math.round(achievement.progress * 100)}%` }} /></div>
              )}
            </div>
            {achievement.unlocked && <span className={styles.achieveCheck} aria-label="Conseguido">✓</span>}
          </article>
        ))}
      </div>
    </section>
  )
}

const relativeDay = (timestamp: number): string => {
  const days = Math.floor((Date.now() - timestamp) / 86_400_000)
  if (days <= 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  return `Hace ${days} días`
}

function MatchHistory() {
  const records = useRecords((state) => state.records)
  const clear = useRecords((state) => state.clear)
  const preferences = usePreferences()
  const navigate = useNavigate()
  const repeatMatch = (record: { deckId: string; seed: number }) => {
    // Misma facción y misma semilla: el motor es determinista, así que
    // reproduce exactamente la misma partida turno a turno.
    preferences.setSelectedDeck(record.deckId)
    navigate(`/battle?seed=${record.seed}`)
  }
  // El historial de campaña (contra la IA) y el de multijugador se cuentan
  // aparte: mezclarlos daría un ratio de victorias sin sentido (rivales de
  // dificultad muy distinta) y el "por mazo" mezclaría bots con personas.
  const vsAi = useMemo(() => aiRecords(records), [records])
  const vsPvp = useMemo(() => pvpRecords(records), [records])
  const tally = useMemo(() => summarizeRecords(vsAi), [vsAi])
  const pvpTally = useMemo(() => summarizeRecords(vsPvp), [vsPvp])
  const byDeck = useMemo(() => summarizeByDeck(vsAi), [vsAi])
  // Solo contra la IA, igual que `byDeck`: mezclar rivales humanos y bots en
  // el mismo ratio no tendría sentido (dificultad muy distinta). El nombre
  // del rival ya se guardaba en cada registro pero nunca se agregaba — solo
  // se veía suelto, fila a fila, en la lista de abajo.
  const byOpponent = useMemo(() => summarizeByOpponent(vsAi), [vsAi])
  const streak = useMemo(() => currentStreak(vsAi), [vsAi])
  const streakLabel = streak > 0 ? `${streak} victoria${streak === 1 ? '' : 's'}` : streak < 0 ? `${-streak} derrota${streak === -1 ? '' : 's'}` : '—'

  if (records.length === 0) {
    return (
      <section className={styles.history}>
        <header className={styles.historyHeader}><h3>Historial de escaramuzas</h3></header>
        <p className={styles.historyEmpty}>Aún no has terminado ninguna partida. Al concluir una escaramuza aparecerá aquí.</p>
      </section>
    )
  }

  return (
    <section className={styles.history}>
      <header className={styles.historyHeader}>
        <h3>Historial de escaramuzas</h3>
        <button className={styles.historyClear} onClick={clear}>Borrar historial</button>
      </header>
      <div className={styles.historyTally}>
        <div className={styles.stat}><strong>{tally.played}</strong><span>Jugadas</span></div>
        <div className={styles.stat}><strong>{tally.won}</strong><span>Victorias</span></div>
        <div className={styles.stat}><strong>{tally.lost}</strong><span>Derrotas</span></div>
        <div className={styles.stat}><strong>{tally.winRate}%</strong><span>Ratio</span></div>
        <div className={styles.stat} data-streak={streak > 0 ? 'win' : streak < 0 ? 'loss' : undefined}><strong>{streakLabel}</strong><span>Racha actual</span></div>
      </div>
      {byDeck.length > 1 && (
        <>
          <span className={styles.pvpTallyLabel}>Tus mazos</span>
          <ul className={styles.byDeck}>
            {byDeck.map((entry) => (
              <li key={entry.deckId}>
                <span>{entry.deckName}</span>
                <strong>{entry.won}/{entry.played}</strong>
              </li>
            ))}
          </ul>
        </>
      )}
      {byOpponent.length > 1 && (
        <>
          <span className={styles.pvpTallyLabel}>Contra cada rival</span>
          <ul className={styles.byDeck}>
            {byOpponent.map((entry) => (
              <li key={entry.opponentDeckName}>
                <span>{entry.opponentDeckName}</span>
                <strong>{entry.won}/{entry.played}</strong>
              </li>
            ))}
          </ul>
        </>
      )}
      {vsPvp.length > 0 && (
        <div className={styles.pvpTally}>
          <span className={styles.pvpTallyLabel}>Multijugador (PvP)</span>
          <div className={styles.historyTally}>
            <div className={styles.stat}><strong>{pvpTally.played}</strong><span>Jugadas</span></div>
            <div className={styles.stat}><strong>{pvpTally.won}</strong><span>Victorias</span></div>
            <div className={styles.stat}><strong>{pvpTally.lost}</strong><span>Derrotas</span></div>
            <div className={styles.stat}><strong>{pvpTally.winRate}%</strong><span>Ratio</span></div>
          </div>
        </div>
      )}
      <ol className={styles.historyList}>
        {records.slice(0, 12).map((record) => (
          <li key={record.id} className={styles.historyRow} data-won={record.won}>
            <span className={styles.historyResult}>{record.won ? 'Victoria' : 'Derrota'}</span>
            <span className={styles.historyDeck}>
              {record.mode === 'pvp' && <span className={styles.pvpBadge}>PvP</span>}
              {record.deckName} <small>vs {record.opponentDeckName}</small>
            </span>
            <span className={styles.historyMeta}>{record.turns} turnos · {record.seconds}s · {relativeDay(record.finishedAt)}</span>
            {/* Repetir reproduce la misma semilla contra la IA: no tiene
                sentido para una partida PvP, cuyo rival fue una persona. */}
            {record.mode !== 'pvp' && (
              <button
                className={styles.historyRepeat}
                onClick={() => repeatMatch(record)}
                title="Vuelve a jugar exactamente esta misma partida, turno a turno"
              >
                ↻ Repetir
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
