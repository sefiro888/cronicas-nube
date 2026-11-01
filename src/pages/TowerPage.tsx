import { useMemo, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { CARD_BY_ID, COMMANDER_BY_ID, STARTER_DECKS } from '../game'
import { FactionSigil } from '../components'
import { WorldAtmosphere } from '../components/WorldAtmosphere'
import { playSynthCue } from '../services/audio'
import { usePreferences } from '../store/preferences'
import { BLESSINGS, TOWER_FLOORS, commanderOfDeck, opponentForFloor, towerMaxHealth, useTower, type BlessingId } from '../store/tower'
import { withBase } from '../utils/assets'
import styles from './TowerPage.module.css'

const BLESSING_ART: Readonly<Record<BlessingId, string>> = {
  mend: 'crecimiento-salvaje', surge: 'cometa-arcano', insight: 'juicio-divino',
}

export function TowerPage() {
  const navigate = useNavigate()
  const preferences = usePreferences()
  const run = useTower((state) => state.run)
  const best = useTower((state) => state.best)
  const start = useTower((state) => state.start)
  const chooseBlessing = useTower((state) => state.chooseBlessing)
  const abandon = useTower((state) => state.abandon)
  const deckId = run?.deckId ?? preferences.selectedDeckId
  const deck = STARTER_DECKS.find((candidate) => candidate.id === deckId) ?? STARTER_DECKS[0]!
  const commander = COMMANDER_BY_ID[deck.commanderId]
  const maxHealth = towerMaxHealth(deck.id)
  const floors = useMemo(() => {
    if (!run) return []
    return Array.from({ length: TOWER_FLOORS }, (_, index) => {
      const floor = index + 1
      const opponentId = opponentForFloor(run, floor)
      const opponent = STARTER_DECKS.find((candidate) => candidate.id === opponentId)
      return { floor, name: commanderOfDeck(opponentId), commander: opponent ? COMMANDER_BY_ID[opponent.commanderId] : undefined,
        done: floor < run.floor || (floor === run.floor && run.awaitingBlessing), current: floor === run.floor && !run.awaitingBlessing }
    })
  }, [run])
  const enterFloor = () => {
    if (!preferences.muted) playSynthCue('ui')
    navigate('/battle?tower=1')
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="tower-title">
        <img className={styles.towerArt} src={withBase('/assets/interface/torre-asedio-v1.webp')}
          srcSet={`${withBase('/assets/interface/torre-asedio-v1-small.webp')} 800w, ${withBase('/assets/interface/torre-asedio-v1.webp')} 1680w`}
          sizes="(max-width: 720px) 1400px, 100vw" alt="Una torre colosal entre tormentas: un dragón la rodea, un gigante de bronce y criaturas del bosque escalan sus muros entre escudos, hielo y portales." fetchPriority="high" />
        <div className={styles.heroShade} aria-hidden="true" />
        <WorldAtmosphere tower />
        <header className={styles.header}>
          <span className={styles.eyebrow}>El desafío de los conquistadores</span>
          <div className={styles.titleOrnament} aria-hidden="true">✧</div>
          <h1 id="tower-title">Torre <span>del Nexo</span></h1>
          <p className={styles.intro}>No basta con vencer.<br /><em>Hay que seguir ascendiendo.</em></p>
          <p className={styles.description}>Un combate contra cada facción, {TOWER_FLOORS} en total. Tu Nexo <strong>no se cura solo</strong>: la Vida que te quede es la que llevas al piso siguiente.</p>
          <div className={styles.heroFacts}><span><strong>{TOWER_FLOORS}</strong> pisos</span><span><strong>1</strong> Nexo</span><span><strong>∞</strong> gloria</span></div>
          <span className={styles.record}>{best > 0 ? `Mejor marca: piso ${best} de ${TOWER_FLOORS}` : 'La cima aún no lleva tu nombre'}</span>
        </header>
        <ol className={styles.ascent} aria-hidden="true">
          {Array.from({ length: TOWER_FLOORS }, (_, index) => {
            const floor = TOWER_FLOORS - index
            return <li key={floor} data-current={run?.floor === floor} data-done={Boolean(run && floor < run.floor)} style={{ '--route-x': `${Math.sin(index * .45) * 14}px` } as CSSProperties}>
              <span>{floor === TOWER_FLOORS ? '✦' : floor.toString().padStart(2, '0')}</span>
              {(floor === TOWER_FLOORS || floor === 1 || run?.floor === floor) && <small>{floor === TOWER_FLOORS ? 'La cima · Duelo espejo' : run?.floor === floor ? 'Estás aquí' : 'El primer umbral'}</small>}
            </li>
          })}
        </ol>
        <div className={styles.expeditionDock}>
          <img src={withBase(commander?.art.webp ?? '')} alt="" />
          <div className={styles.dockIdentity}><small>{run ? `Tu ascensión · piso ${run.floor} / ${TOWER_FLOORS}` : 'Tu expedición'}</small><strong>{commander?.name}</strong><span>{deck.name}</span></div>
          {run ? <div className={styles.health} aria-label={`Vida del Nexo: ${run.health} de ${maxHealth}`}><span>Vida del Nexo</span><strong>♥ {run.health} <small>/ {maxHealth}</small></strong><span className={styles.healthBar}><span style={{ width: `${Math.round(run.health / maxHealth * 100)}%` }} /></span></div> : <a className={styles.changeDeck} href="#expedicion">Cambiar facción <span aria-hidden="true">↓</span></a>}
          {!run ? <button type="button" className={styles.primary} onClick={() => start(deck.id)}>Comenzar la subida <span aria-hidden="true">↗</span></button>
            : run.awaitingBlessing ? <a className={styles.primary} href="#bendiciones">Elegir una bendición <span aria-hidden="true">↓</span></a>
              : <button type="button" className={styles.primary} onClick={enterFloor}>Entrar al piso {run.floor} · {commanderOfDeck(opponentForFloor(run, run.floor))} <span aria-hidden="true">↗</span></button>}
        </div>
      </section>

      {!run ? (
        <section id="expedicion" className={styles.start}>
          <header className={styles.sectionHeader}><div><span className={styles.eyebrow}>Antes de cruzar el umbral</span><h2>Elige con qué mazo subes</h2></div><p>No se puede cambiar a mitad de Torre.<br />El último piso es un duelo contra tu propio comandante.</p></header>
          <div className={styles.deckPicker} aria-label="Facciones para la Torre">
            {STARTER_DECKS.map((candidate) => {
              const leader = COMMANDER_BY_ID[candidate.commanderId]
              const selected = candidate.id === deck.id
              return <button key={candidate.id} type="button" className={styles.deckOption} data-selected={selected} aria-pressed={selected} onClick={() => preferences.setSelectedDeck(candidate.id)}>
                <img src={withBase(leader?.art.webp ?? '')} alt="" loading="lazy" />
                <span className={styles.deckShade} aria-hidden="true" />
                <span className={styles.deckSigil}><FactionSigil faction={candidate.faction} size="small" decorative /></span>
                <span className={styles.deckText}><strong>{candidate.name}</strong><small>{leader?.name}</small></span>
                <span className={styles.selectedMark} aria-hidden="true">{selected ? '✓' : '↗'}</span>
              </button>
            })}
          </div>
          <div className={styles.rules}><span><b>01</b><strong>Conserva tu Vida</strong><small>Cada herida viaja contigo al siguiente piso.</small></span><span><b>02</b><strong>Elige tu bendición</strong><small>Tras cada victoria, decide cómo continuar.</small></span><span><b>03</b><strong>Enfréntate a ti mismo</strong><small>Tu comandante te espera en el último umbral.</small></span></div>
        </section>
      ) : (
        <section className={styles.run}>
          {run.awaitingBlessing && <section id="bendiciones" className={styles.blessings} aria-labelledby="blessing-title"><span className={styles.eyebrow}>La Torre reconoce tu victoria</span><h2 id="blessing-title">Piso superado. Elige una bendición</h2><div className={styles.blessingRow}>{(Object.keys(BLESSINGS) as BlessingId[]).map((id) => <button key={id} type="button" className={styles.blessing} onClick={() => chooseBlessing(id)}><img src={withBase(CARD_BY_ID[BLESSING_ART[id]]?.art.webp ?? '')} alt="" /><span className={styles.blessingText}><strong>{BLESSINGS[id].name}</strong><span>{BLESSINGS[id].description}</span></span><span className={styles.blessingArrow} aria-hidden="true">↗</span></button>)}</div></section>}
          <header className={styles.sectionHeader}><div><span className={styles.eyebrow}>El camino a la cima</span><h2>Cada piso, una conquista.</h2></div><div><p>{TOWER_FLOORS} umbrales. Una sola expedición.</p>{run.enemyPenalty > 0 && <p className={styles.penalty}>El rival de este piso empieza con {run.enemyPenalty} de Vida menos.</p>}</div></header>
          <ol className={styles.floors} aria-label="Recorrido de la Torre">{floors.map((item) => <li key={item.floor} className={styles.floor} data-done={item.done} data-current={item.current} aria-current={item.current ? 'step' : undefined}><span className={styles.floorNumber}>{item.done ? '✓' : item.floor.toString().padStart(2, '0')}</span>{item.commander && <img src={withBase(item.commander.art.webp)} alt="" loading="lazy" />}<span className={styles.floorName}><small>{item.current ? 'Tu próximo rival' : item.done ? 'Conquistado' : `Piso ${item.floor}`}</small>{item.name}{item.floor === TOWER_FLOORS && <span className={styles.mirror}>Duelo espejo</span>}</span></li>)}</ol>
          <button type="button" className={styles.abandonButton} onClick={abandon}>Abandonar la Torre</button>
        </section>
      )}
    </div>
  )
}
