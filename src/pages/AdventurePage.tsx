import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { COMMANDER_BY_ID, STARTER_DECKS } from '../game/decks'
import { FACTION_BY_ID } from '../game/factions'
import type { MatchState } from '../game/types'
import {
  ADVENTURE_BOSSES,
  ATLAS_ROUTE,
  adventureCommanderName,
  bossById,
  campaignChapters,
  type AdventureKind,
  type BossId,
} from '../game/adventure'
import { FactionSigil } from '../components/FactionSigil'
import { useAdventure } from '../store/adventure'
import { useMatchStore } from '../store/match'
import { usePreferences } from '../store/preferences'
import { withBase } from '../utils/assets'
import { AdventureRoute } from './AdventureRoute'
import styles from './AdventurePage.module.css'

const MODE_NAMES = {
  campaign: 'Crónicas de facción',
  boss: 'Guardianes del Nexo',
  series: 'Duelo al mejor de tres',
  route: 'Ruta del sello partido',
} as const

export function AdventurePage() {
  const navigate = useNavigate()
  const selectedDeck = usePreferences((state) => state.selectedDeckId)
  const [deckId, setDeckId] = useState(selectedDeck)
  const [opponentId, setOpponentId] = useState(
    STARTER_DECKS.find((deck) => deck.id !== selectedDeck)?.id ?? STARTER_DECKS[0]!.id,
  )
  const [mode, setMode] = useState<AdventureKind>(() => useAdventure.getState().run?.kind === 'route' ? 'route' : 'campaign')
  const [bossId, setBossId] = useState<BossId>('corazon-caldera')
  const adventure = useAdventure()
  const deck = STARTER_DECKS.find((entry) => entry.id === deckId) ?? STARTER_DECKS[0]!
  const commander = COMMANDER_BY_ID[deck.commanderId]!
  const chapters = campaignChapters(deck.faction)
  const progress = adventure.campaignProgress[deck.faction] ?? 0
  const boss = bossById(bossId)!
  const run = adventure.run
  const routeDeck = mode === 'route' && run?.kind === 'route' && run.status !== 'complete' ? run.playerDeckId : undefined
  const currentChapter =
    run?.kind === 'campaign' ? campaignChapters(run.faction)[run.chapter] : undefined

  const enter = () => {
    const current = useAdventure.getState().run
    if (!current) return
    if (current.kind !== 'route') usePreferences.getState().setSelectedDeck(current.playerDeckId)
    const existing = useMatchStore.getState().match
    if (
      current.status === 'fighting' &&
      existing &&
      existing.seed === current.battleSeed &&
      !existing.winner
    ) {
      navigate('/battle?adventure=1')
      return
    }
    const match = useAdventure.getState().prepareBattle()
    if (match) {
      useMatchStore.getState().startFromMatch(match, 'adventure')
      navigate('/battle?adventure=1')
    }
  }
  const start = (chapter = 0) => {
    if (mode === 'campaign') adventure.startCampaign(deck.id, chapter)
    if (mode === 'boss') adventure.startBoss(deck.id, bossId)
    if (mode === 'series') adventure.startSeries(deck.id, opponentId)
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>Otros caminos hacia el Nexo</span>
        <h1>La Cámara de las Crónicas</h1>
        <p>
          Campañas, guardianes y duelos encadenados. Tus cartas siguen disponibles en todos los
          modos.
        </p>
        <Link to="/laboratory" className={styles.labLink}>
          ✧ Entrar al laboratorio sin rival
        </Link>
      </header>
      {run && run.kind !== 'route' && (
        <section className={styles.active} aria-label="Aventura en curso">
          <div>
            <span className={styles.eyebrow}>{MODE_NAMES[run.kind]}</span>
            <h2>
              {run.kind === 'campaign'
                ? `${FACTION_BY_ID[run.faction].name} · ${currentChapter?.title}`
                : run.kind === 'boss'
                  ? bossById(run.bossId)?.name
                  : `Combate ${run.round} · ${run.wins} — ${run.losses}`}
            </h2>
            <p>
              {run.status === 'ready'
                ? (currentChapter?.introduction ?? 'Todo está preparado para tu próximo combate.')
                : run.status === 'fighting'
                  ? 'Tu combate está en marcha. Puedes retomarlo.'
                  : run.status === 'lost'
                    ? 'El Nexo ha caído. La crónica conserva lo aprendido.'
                    : (currentChapter?.conclusion ??
                      (run.kind === 'series'
                        ? `Serie terminada: ${run.wins} victorias y ${run.losses} derrotas.`
                        : 'El guardián ha sido derrotado.'))}
            </p>
            {run.status === 'ready' && currentChapter && (
              <>
                <blockquote>{currentChapter.dialogue}</blockquote>
                <p>
                  <strong>Objetivo:</strong> {currentChapter.objective}
                </p>
              </>
            )}
            {run.status === 'ready' && run.bossId && (
              <p className={styles.rule}>
                <strong>Segunda fase:</strong> {bossById(run.bossId)?.rule}
              </p>
            )}
          </div>
          <div className={styles.runActions}>
            {(run.status === 'ready' || run.status === 'fighting') && (
              <button onClick={enter}>
                {run.status === 'fighting' ? 'Retomar combate' : 'Entrar en batalla'}
              </button>
            )}
            {(run.status === 'won' || run.status === 'lost') && run.kind === 'series' && (
              <button onClick={adventure.advance}>Preparar siguiente combate</button>
            )}
            {run.status === 'won' && run.kind === 'campaign' && (
              <button onClick={adventure.advance}>Siguiente capítulo</button>
            )}
            {run.status === 'lost' && run.kind !== 'series' && (
              <button onClick={adventure.retry}>Preparar otro intento</button>
            )}
            <button className={styles.secondary} onClick={adventure.abandon}>
              {run.status === 'complete' ? 'Cerrar crónica' : 'Abandonar aventura'}
            </button>
          </div>
        </section>
      )}
      <div role="tablist" aria-label="Modalidad" className={styles.tabs}>
        {(Object.keys(MODE_NAMES) as AdventureKind[]).map((id) => (
          <button key={id} role="tab" aria-selected={mode === id} onClick={() => setMode(id)}>
            {MODE_NAMES[id]}
          </button>
        ))}
      </div>
      <section className={styles.setup} data-route={mode === 'route' || undefined}>
        <div className={styles.identity}>
          <img src={withBase(commander.art.webp)} alt={commander.art.alt} />
          <div>
            <FactionSigil faction={deck.faction} size="small" />
            <h2>{FACTION_BY_ID[deck.faction].name}</h2>
            <p>{commander.name}</p>
          </div>
        </div>
        <div className={styles.configuration}>
          <label>
            Tu expedición
            <select value={routeDeck ?? deck.id} disabled={Boolean(routeDeck)} onChange={(event) => setDeckId(event.target.value)}>
              {STARTER_DECKS.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
          {mode === 'series' && (
            <>
              <label>
                Rival de la serie
                <select value={opponentId} onChange={(event) => setOpponentId(event.target.value)}>
                  {STARTER_DECKS.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </label>
              <p>
                Gana quien consiga dos victorias. Ambos mazos se mantienen fijos durante la serie;
                cada combate empieza de nuevo y utiliza una semilla diferente.
              </p>
            </>
          )}
          {mode === 'boss' && (
            <>
              <label>
                Guardián
                <select
                  value={bossId}
                  onChange={(event) => setBossId(event.target.value as BossId)}
                >
                  {ADVENTURE_BOSSES.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </label>
              <p className={styles.rule}>
                {boss.health} de Vida inicial · {boss.rule}
              </p>
            </>
          )}
          {mode === 'campaign' ? (
            <p>
              Progreso de esta facción: {progress} / 3 capítulos. Los capítulos superados pueden
              repetirse. Cada combate se gana destruyendo el Nexo rival.
            </p>
          ) : mode !== 'route' && (
            <button disabled={Boolean(run && run.status !== 'complete')} onClick={() => start()}>
              Preparar {mode === 'boss' ? 'desafío' : 'serie'}
            </button>
          )}
          {run && run.status !== 'complete' && (
            <small>Cierra o abandona la aventura en curso antes de iniciar otra.</small>
          )}
        </div>
      </section>
      {mode === 'route' && <AdventureRoute run={run} deckId={deck.id} onEnter={enter} />}
      {mode === 'campaign' && (
        <ol className={styles.chapters}>
          {chapters.map((chapter) => (
            <li key={chapter.index} data-locked={chapter.index > progress || undefined}>
              <span className={styles.chapterNumber}>
                {chapter.index < progress ? '✓' : `0${chapter.index + 1}`}
              </span>
              <div>
                <h3>{chapter.title}</h3>
                <p>{chapter.introduction}</p>
                <p className={styles.rival}>
                  Rival: {adventureCommanderName(chapter.opponentDeckId)}
                  {chapter.bossId ? ' · Jefe de dos fases' : ''}
                </p>
                <button
                  disabled={chapter.index > progress || Boolean(run && run.status !== 'complete')}
                  onClick={() => start(chapter.index)}
                >
                  {chapter.index > progress
                    ? 'Completa el capítulo anterior'
                    : chapter.index < progress
                      ? 'Volver a recorrer'
                      : 'Preparar capítulo'}
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <p className={styles.notice}>
        Las reglas especiales pertenecen a estos desafíos. Las escaramuzas, el multijugador y la
        Torre clásica conservan sus reglas.
      </p>
    </div>
  )
}

export function AdventureBattlePanel({
  match,
  queueBusy = false,
}: {
  readonly match: MatchState | undefined
  readonly queueBusy?: boolean
}) {
  const run = useAdventure((state) => state.run)
  const navigate = useNavigate()
  useEffect(() => {
    if (match?.winner && !queueBusy) useAdventure.getState().reportResult(match.seed, match.winner)
  }, [match, queueBusy])
  if (!run || !match || run.battleSeed !== match.seed) return null
  const boss = bossById(run.bossId)
  return (
    <aside className={styles.battlePanel} aria-label="Estado de la aventura">
      <strong>
        {run.kind === 'series'
          ? `Serie · ${run.wins} — ${run.losses} · Combate ${run.round}`
          : run.kind === 'campaign'
            ? `Crónica ${FACTION_BY_ID[run.faction].name} · Capítulo ${run.chapter + 1}/3`
            : run.kind === 'route' && run.routeNode ? ATLAS_ROUTE[run.routeNode].title : boss?.name}
      </strong>
      {boss && (
        <span>
          Fase {run.bossPhase}/2 · {run.bossPhase === 1 ? 'El despertar aguarda' : boss.phaseName}
        </span>
      )}
      {match.winner && !queueBusy && (
        <button onClick={() => navigate('/adventures')}>
          {run.kind === 'route' ? 'Volver al mapa' : run.status === 'complete'
            ? 'Ver desenlace'
            : run.status === 'lost' && run.kind !== 'series'
              ? 'Volver a la crónica'
              : 'Continuar aventura'}{' '}
          →
        </button>
      )}
    </aside>
  )
}
