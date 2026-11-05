import { useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { CARD_BY_ID, COMMANDER_BY_ID, STARTER_DECKS } from '../game'
import { FactionSigil } from '../components'
import { WorldAtmosphere } from '../components/WorldAtmosphere'
import { playSynthCue } from '../services/audio'
import { usePreferences } from '../store/preferences'
import {
  BLESSINGS,
  TOWER_RELICS,
  TOWER_VARIANTS,
  commanderOfDeck,
  nextTowerRelic,
  opponentForFloor,
  towerCanEnter,
  towerEncounter,
  towerFloorCount,
  towerGuardian,
  towerMaxHealth,
  towerRoutes,
  towerVariant,
  useTower,
  type BlessingId,
  type TowerVariant,
} from '../store/tower'
import { withBase } from '../utils/assets'
import styles from './TowerPage.module.css'

const BLESSING_ART: Readonly<Record<BlessingId, string>> = {
  mend: 'crecimiento-salvaje',
  surge: 'cometa-arcano',
  insight: 'juicio-divino',
}

export function TowerPage() {
  const navigate = useNavigate()
  const preferences = usePreferences()
  const run = useTower((state) => state.run)
  const best = useTower((state) => state.best)
  const variantBest = useTower((state) => state.variantBest)
  const lastRun = useTower((state) => state.lastRun)
  const start = useTower((state) => state.start)
  const chooseBlessing = useTower((state) => state.chooseBlessing)
  const chooseRoute = useTower((state) => state.chooseRoute)
  const chooseEncounter = useTower((state) => state.chooseEncounter)
  const abandon = useTower((state) => state.abandon)
  const [selectedVariant, setSelectedVariant] = useState<TowerVariant>('classic')
  const variant = run ? towerVariant(run) : selectedVariant
  const count = run ? towerFloorCount(run) : TOWER_VARIANTS[variant].floors
  const record = variant === 'classic' ? best : (variantBest?.[variant] ?? 0)
  const deckId = run?.deckId ?? preferences.selectedDeckId
  const deck = STARTER_DECKS.find((candidate) => candidate.id === deckId) ?? STARTER_DECKS[0]!
  const commander = COMMANDER_BY_ID[deck.commanderId]
  const maxHealth = towerMaxHealth(deck.id)
  const routes = run ? towerRoutes(run) : []
  const encounter = run ? towerEncounter(run) : undefined
  const nextRelic = run ? nextTowerRelic(run) : undefined
  const floors = useMemo(() => {
    if (!run) return []
    return Array.from({ length: towerFloorCount(run) }, (_, index) => {
      const floor = index + 1
      const opponentId = opponentForFloor(run, floor)
      const opponent = STARTER_DECKS.find((candidate) => candidate.id === opponentId)
      return {
        floor,
        name: opponentId ? commanderOfDeck(opponentId) : 'Dos caminos por elegir',
        commander: opponent ? COMMANDER_BY_ID[opponent.commanderId] : undefined,
        done:
          floor < run.floor ||
          (floor === run.floor && (run.awaitingBlessing || run.awaitingEncounter)),
        current: floor === run.floor && !run.awaitingBlessing && !run.awaitingEncounter,
      }
    })
  }, [run])
  const enterFloor = () => {
    if (!run || !towerCanEnter(run)) return
    if (!preferences.muted) playSynthCue('ui')
    navigate('/battle?tower=1')
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="tower-title">
        <img
          className={styles.towerArt}
          src={withBase('/assets/interface/torre-asedio-v1.webp')}
          srcSet={`${withBase('/assets/interface/torre-asedio-v1-small.webp')} 800w, ${withBase('/assets/interface/torre-asedio-v1.webp')} 1680w`}
          sizes="(max-width: 720px) 1400px, 100vw"
          alt="Una torre colosal entre tormentas y mundos de las facciones."
          fetchPriority="high"
        />
        <div className={styles.heroShade} aria-hidden="true" />
        <WorldAtmosphere tower />
        <header className={styles.header}>
          <span className={styles.eyebrow}>El desafío de los conquistadores</span>
          <div className={styles.titleOrnament} aria-hidden="true">
            ✧
          </div>
          <h1 id="tower-title">
            Torre <span>del Nexo</span>
          </h1>
          <p className={styles.intro}>
            No basta con vencer.
            <br />
            <em>Hay que seguir ascendiendo.</em>
          </p>
          <p className={styles.description}>
            {TOWER_VARIANTS[variant].description} Tu Nexo <strong>no se cura solo</strong>: conserva
            la Vida entre los combates.
          </p>
          <div className={styles.heroFacts}>
            <span>
              <strong>{count}</strong> pisos
            </span>
            <span>
              <strong>1</strong> Nexo
            </span>
            <span>
              <strong>∞</strong> gloria
            </span>
          </div>
          <span className={styles.record}>
            {record > 0
              ? `Mejor marca: piso ${record} de ${count}`
              : 'La cima aún no lleva tu nombre'}
          </span>
        </header>
        <ol className={styles.ascent} aria-hidden="true">
          {Array.from({ length: count }, (_, index) => {
            const floor = count - index
            return (
              <li
                key={floor}
                data-current={run?.floor === floor}
                data-done={Boolean(run && floor < run.floor)}
                style={{ '--route-x': `${Math.sin(index * 0.45) * 14}px` } as CSSProperties}
              >
                <span>{floor === count ? '✦' : floor.toString().padStart(2, '0')}</span>
                {(floor === count || floor === 1 || run?.floor === floor) && (
                  <small>
                    {floor === count
                      ? 'La cima · Duelo espejo'
                      : run?.floor === floor
                        ? 'Estás aquí'
                        : 'El primer umbral'}
                  </small>
                )}
              </li>
            )
          })}
        </ol>
        <div className={styles.expeditionDock}>
          <img src={withBase(commander?.art.webp ?? '')} alt="" />
          <div className={styles.dockIdentity}>
            <small>{run ? `Tu ascensión · piso ${run.floor} / ${count}` : 'Tu expedición'}</small>
            <strong>{commander?.name}</strong>
            <span>{deck.name}</span>
          </div>
          {run ? (
            <div
              className={styles.health}
              aria-label={`Vida del Nexo: ${run.health} de ${maxHealth}`}
            >
              <span>Vida del Nexo</span>
              <strong>
                ♥ {run.health} <small>/ {maxHealth}</small>
              </strong>
              <span className={styles.healthBar}>
                <span style={{ width: `${Math.round((run.health / maxHealth) * 100)}%` }} />
              </span>
            </div>
          ) : (
            <a className={styles.changeDeck} href="#expedicion">
              Cambiar facción <span aria-hidden="true">↓</span>
            </a>
          )}
          {!run ? (
            <button
              type="button"
              className={styles.primary}
              onClick={() => start(deck.id, undefined, variant)}
            >
              Comenzar la subida <span aria-hidden="true">↗</span>
            </button>
          ) : run.awaitingEncounter ? (
            <a className={styles.primary} href="#encuentro">
              Resolver el encuentro ↓
            </a>
          ) : run.awaitingBlessing ? (
            <a className={styles.primary} href="#bendiciones">
              Elegir una bendición ↓
            </a>
          ) : !towerCanEnter(run) ? (
            <a className={styles.primary} href="#rutas">
              Elegir un camino ↓
            </a>
          ) : (
            <button type="button" className={styles.primary} onClick={enterFloor}>
              Entrar al piso {run.floor} · {commanderOfDeck(opponentForFloor(run, run.floor))} ↗
            </button>
          )}
        </div>
      </section>

      {!run ? (
        <section id="expedicion" className={styles.start}>
          <header className={styles.sectionHeader}>
            <div>
              <span className={styles.eyebrow}>Tres formas de ascender</span>
              <h2>Elige tu expedición</h2>
            </div>
            <p>
              Las reliquias y los guardianes solo afectan a las variantes.
              <br />
              La ascensión clásica conserva sus reglas.
            </p>
          </header>
          <div className={styles.variantPicker} aria-label="Modalidad de Torre">
            {(Object.keys(TOWER_VARIANTS) as TowerVariant[]).map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={variant === id}
                onClick={() => setSelectedVariant(id)}
              >
                <small>{TOWER_VARIANTS[id].floors} PISOS</small>
                <strong>{TOWER_VARIANTS[id].name}</strong>
                <span>{TOWER_VARIANTS[id].description}</span>
              </button>
            ))}
          </div>
          {lastRun && (
            <p className={styles.runSummary} role="status">
              {lastRun.won ? 'Expedición completada' : 'Tu última expedición'} ·{' '}
              {TOWER_VARIANTS[lastRun.variant].name} · {lastRun.floors}/{lastRun.total} pisos ·{' '}
              {lastRun.relics.length} reliquias
            </p>
          )}
          <header className={styles.sectionHeader}>
            <div>
              <span className={styles.eyebrow}>Antes de cruzar el umbral</span>
              <h2>Elige con qué mazo subes</h2>
            </div>
            <p>
              No se puede cambiar a mitad de Torre.
              <br />
              El último piso es un duelo contra tu propio comandante.
            </p>
          </header>
          <div className={styles.deckPicker} aria-label="Facciones para la Torre">
            {STARTER_DECKS.map((candidate) => {
              const leader = COMMANDER_BY_ID[candidate.commanderId]
              const selected = candidate.id === deck.id
              return (
                <button
                  key={candidate.id}
                  type="button"
                  className={styles.deckOption}
                  data-selected={selected}
                  aria-pressed={selected}
                  onClick={() => preferences.setSelectedDeck(candidate.id)}
                >
                  <img src={withBase(leader?.art.webp ?? '')} alt="" loading="lazy" />
                  <span className={styles.deckShade} aria-hidden="true" />
                  <span className={styles.deckSigil}>
                    <FactionSigil faction={candidate.faction} size="small" decorative />
                  </span>
                  <span className={styles.deckText}>
                    <strong>{candidate.name}</strong>
                    <small>{leader?.name}</small>
                  </span>
                  <span className={styles.selectedMark} aria-hidden="true">
                    {selected ? '✓' : '↗'}
                  </span>
                </button>
              )
            })}
          </div>
          <div className={styles.rules}>
            <span>
              <b>01</b>
              <strong>Conserva tu Vida</strong>
              <small>Cada herida viaja contigo al siguiente piso.</small>
            </span>
            <span>
              <b>02</b>
              <strong>Elige tu bendición</strong>
              <small>Tras cada victoria, decide cómo continuar.</small>
            </span>
            <span>
              <b>03</b>
              <strong>Enfréntate a ti mismo</strong>
              <small>Tu comandante te espera en el último umbral.</small>
            </span>
          </div>
        </section>
      ) : (
        <section className={styles.run}>
          <p className={styles.variantName}>
            {TOWER_VARIANTS[variant].name} · Semilla {run.seed}
          </p>
          {variant !== 'classic' && (
            <div className={styles.relicShelf} aria-label="Reliquias de la expedición">
              <div>
                <span className={styles.eyebrow}>Solo en esta expedición</span>
                <h2>Tus reliquias</h2>
              </div>
              {(run.relics ?? []).length === 0 ? (
                <p>
                  Los centinelas y los encuentros guardan tesoros. Sus efectos se explican antes de
                  elegir.
                </p>
              ) : (
                run.relics?.map((id) => (
                  <article key={id}>
                    <img src={withBase(CARD_BY_ID[TOWER_RELICS[id].art]?.art.webp ?? '')} alt="" />
                    <div>
                      <strong>{TOWER_RELICS[id].name}</strong>
                      <p>{TOWER_RELICS[id].description}</p>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}
          {run.awaitingEncounter && encounter && (
            <section id="encuentro" className={styles.encounter} aria-labelledby="encounter-title">
              <span className={styles.eyebrow}>Entre dos mundos</span>
              <h2 id="encounter-title">{encounter.name}</h2>
              <p>{encounter.description}</p>
              <div className={styles.encounterChoices}>
                <button type="button" onClick={() => chooseEncounter('heal')}>
                  <strong>Escuchar las voces</strong>
                  <span>Recupera 6 de Vida, hasta tu máximo.</span>
                </button>
                <button
                  type="button"
                  disabled={run.health <= 5 || !nextRelic}
                  onClick={() => chooseEncounter('relic')}
                >
                  <strong>
                    Reclamar {nextRelic ? TOWER_RELICS[nextRelic].name : 'una reliquia'}
                  </strong>
                  <span>
                    {nextRelic
                      ? 'Entrega 5 de Vida y conserva esta reliquia hasta el final de la expedición.'
                      : 'Ya has reunido todas las reliquias.'}
                    {run.health <= 5 ? ' Necesitas más de 5 de Vida.' : ''}
                  </span>
                </button>
                <button type="button" onClick={() => chooseEncounter('scout')}>
                  <strong>Seguir el rastro</strong>
                  <span>El Nexo rival del próximo piso empieza con 5 de Vida menos.</span>
                </button>
              </div>
            </section>
          )}
          {run.awaitingBlessing && (
            <section id="bendiciones" className={styles.blessings} aria-labelledby="blessing-title">
              <span className={styles.eyebrow}>La Torre reconoce tu victoria</span>
              <h2 id="blessing-title">Piso superado. Elige una bendición</h2>
              <div className={styles.blessingRow}>
                {(Object.keys(BLESSINGS) as BlessingId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={styles.blessing}
                    onClick={() => chooseBlessing(id)}
                  >
                    <img src={withBase(CARD_BY_ID[BLESSING_ART[id]]?.art.webp ?? '')} alt="" />
                    <span className={styles.blessingText}>
                      <strong>{BLESSINGS[id].name}</strong>
                      <span>{BLESSINGS[id].description}</span>
                    </span>
                    <span className={styles.blessingArrow} aria-hidden="true">
                      ↗
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
          {variant === 'paths' &&
            !run.awaitingEncounter &&
            !run.awaitingBlessing &&
            routes.length > 0 &&
            !run.routes?.[run.floor] && (
              <section id="rutas" className={styles.routeSection} aria-labelledby="routes-title">
                <span className={styles.eyebrow}>
                  Piso {run.floor} · Una decisión cambia el camino
                </span>
                <h2 id="routes-title">Elige tu próximo umbral</h2>
                {run.floor % 3 === 0 && (
                  <p>
                    Es un piso de guardián: ambos caminos tienen +8 de Vida, una fuente inicial y
                    una reliquia como recompensa.
                  </p>
                )}
                <div className={styles.routeChoices}>
                  {routes.map((route) => {
                    const rival = STARTER_DECKS.find((candidate) => candidate.id === route.deckId)
                    return (
                      <button key={route.id} type="button" onClick={() => chooseRoute(route.id)}>
                        <img
                          src={withBase(COMMANDER_BY_ID[rival?.commanderId ?? '']?.art.webp ?? '')}
                          alt=""
                        />
                        <div>
                          <small>{route.name}</small>
                          <strong>{commanderOfDeck(route.deckId)}</strong>
                          <p>
                            {run.floor % 3 === 0
                              ? 'Guardián del umbral · elige a qué comandante enfrentarte.'
                              : route.description}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>
            )}
          {towerCanEnter(run) && towerGuardian(run) && (
            <p className={styles.guardianNote}>
              ◆ Guardián del umbral: el Nexo rival recibe +8 de Vida y empieza con una fuente
              adicional.{' '}
              {run.floor < count
                ? 'Vencer entrega una reliquia que aún no tengas, mientras queden por descubrir.'
                : 'Es el último desafío de la expedición.'}
            </p>
          )}
          <header className={styles.sectionHeader}>
            <div>
              <span className={styles.eyebrow}>El camino a la cima</span>
              <h2>Cada piso, una conquista.</h2>
            </div>
            <div>
              <p>{count} umbrales. Una sola expedición.</p>
              {run.enemyPenalty > 0 && (
                <p className={styles.penalty}>
                  El rival de este piso empieza con {run.enemyPenalty} de Vida menos por tus
                  elecciones.
                </p>
              )}
            </div>
          </header>
          <ol className={styles.floors} aria-label="Recorrido de la Torre">
            {floors.map((item) => (
              <li
                key={item.floor}
                className={styles.floor}
                data-done={item.done}
                data-current={item.current}
                aria-current={item.current ? 'step' : undefined}
              >
                <span className={styles.floorNumber}>
                  {item.done ? '✓' : item.floor.toString().padStart(2, '0')}
                </span>
                {item.commander && <img src={withBase(item.commander.art.webp)} alt="" />}
                <span className={styles.floorName}>
                  <small>
                    {item.current
                      ? 'Tu próximo rival'
                      : item.done
                        ? 'Conquistado'
                        : `Piso ${item.floor}`}
                  </small>
                  {item.name}
                  {item.floor === count && (
                    <span className={styles.mirror}>
                      Duelo espejo{variant !== 'classic' ? ' · Guardián final' : ''}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
          <button type="button" className={styles.abandonButton} onClick={abandon}>
            Abandonar la Torre
          </button>
        </section>
      )}
    </div>
  )
}
