import { lazy, Suspense, useMemo, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { FACTION_LABELS, FactionSigil } from '../components/FactionSigil'
import { createMatch, STARTER_DECKS } from '../game'
import { SCENARIO_ATLAS, SCENARIO_ENVIRONMENTS, type SceneId } from '../battle/scenarioEnvironments'
import { resolveScenario } from '../battle/scenarioForFaction'
import { usePreferences } from '../store/preferences'
import { SCENARIO_MOODS, SCENARIO_MOOD_LABELS, ScenarioMoodPreview, useScenarioMood, type ScenarioMood } from '../store/scenarioMood'
import { WorldAtlas } from './WorldAtlas'
import { withBase } from '../utils/assets'
import styles from './ScenarioAtlasPage.module.css'

const Board3D = lazy(() => import('../battle/Board3D').then((module) => ({ default: module.Board3D })))
const EMPTY = new Set<string>()
const nothing = () => undefined

export function ScenarioAtlasPage() {
  const preferences = usePreferences()
  const chosenDeck = STARTER_DECKS.find((deck) => deck.id === preferences.selectedDeckId)
  const [selected, setSelected] = useState<SceneId>(() => resolveScenario(preferences.scenario, chosenDeck?.faction))
  const savedMood = useScenarioMood((state) => state.mood)
  const setMood = useScenarioMood((state) => state.setMood)
  const [mood, setPreviewMood] = useState<ScenarioMood>(savedMood)
  const [exploring, setExploring] = useState(false)
  const [cameraKey, setCameraKey] = useState(0)
  const [message, setMessage] = useState('')
  const scene = SCENARIO_ATLAS.find((entry) => entry.id === selected)!
  const match = useMemo(() => {
    const deck = STARTER_DECKS.find((candidate) => candidate.faction === SCENARIO_ENVIRONMENTS[selected].faction) ?? STARTER_DECKS[0]!
    return createMatch(deck, STARTER_DECKS.find((candidate) => candidate.id !== deck.id) ?? deck, 903)
  }, [selected])

  const selectScene = (id: SceneId) => {
    setSelected(id)
    setMessage('')
  }

  return <main className={styles.page}>
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>Los mundos de Crónicas del Nexo</span><h1>Atlas de escenarios</h1><p>Diecinueve territorios, cada uno con su suelo, su luz y su historia.</p></div>
      <Link to="/play" className={styles.back}>Volver a jugar</Link>
    </header>
    <section className={styles.worldMap} aria-label="Mapa ilustrado del Nexo">
      <WorldAtlas label="Territorios del atlas" markers={SCENARIO_ATLAS.map(({ id }) => ({ id }))}
        selected={selected} onSelect={selectScene} />
      <div className={styles.mapCaption}>
        <p aria-live="polite"><small>Territorio seleccionado</small><strong>{scene.name}</strong></p>
        <a href="#ficha-del-escenario" className={styles.back}>Ver ficha del escenario <span aria-hidden="true">↓</span></a>
      </div>
    </section>
    <section id="ficha-del-escenario" className={styles.detail} aria-labelledby="atlas-scene-title" style={{ '--scene-accent': scene.accent } as CSSProperties}>
      <div className={styles.preview}>
        {exploring ? <ScenarioMoodPreview mood={mood}>
          <Suspense fallback={<p className={styles.loading}>Abriendo el territorio…</p>}>
            <Board3D key={`${selected}-${cameraKey}`} state={match} localPlayerId="player" validCells={[]} cellIntent="move" validTargets={[]} readyPieceIds={EMPTY}
              onCell={nothing} onPiece={nothing} onNexus={nothing} photoMode reducedMotion={preferences.reducedMotion} quality={preferences.graphicsQuality} scenario={selected} />
          </Suspense>
        </ScenarioMoodPreview> : <>
          <img src={withBase(scene.panorama)} alt={`${scene.name}: ${scene.setting}`} className={styles.panorama} />
          <div className={styles.previewShade} /><button className={styles.explore} type="button" onClick={() => setExploring(true)}>Explorar el escenario en 3D <span>Gira y acerca la cámara libremente</span></button>
        </>}
        {exploring && <div className={styles.previewTools}><button type="button" onClick={() => setCameraKey((key) => key + 1)}>Restablecer cámara</button><button type="button" onClick={() => setExploring(false)}>Ver panorama</button></div>}
      </div>
      <div className={styles.story}>
        <span className={styles.faction}><FactionSigil faction={scene.faction} size="small" decorative />{FACTION_LABELS[scene.faction]}</span>
        <h2 id="atlas-scene-title">{scene.name}</h2><p className={styles.setting}>{scene.setting}</p><p className={styles.lore}>{scene.lore}</p>
        <ul className={styles.features}>{scene.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
        <div className={styles.material}><img src={withBase(scene.floor)} alt={`Suelo propio de ${FACTION_LABELS[scene.faction]}`} /><div><strong>El pavimento de este mundo</strong><p>El escenario conserva su suelo propio también al elegirlo manualmente.</p></div></div>
        <fieldset className={styles.moods}><legend>Iluminación</legend>{SCENARIO_MOODS.map((option) => <button key={option} type="button" aria-pressed={mood === option} onClick={() => setPreviewMood(option)}>{SCENARIO_MOOD_LABELS[option]}</button>)}</fieldset>
        <p className={styles.note}>Explorar no cambia tu elección. La variante de luz se aprecia en la vista 3D.</p>
        <button type="button" className={styles.apply} onClick={() => { preferences.setScenario(selected); setMood(mood); setMessage(`${scene.name} y ${SCENARIO_MOOD_LABELS[mood].toLowerCase()} preparados para jugar. Tu mazo se conserva.`) }}>Usar este escenario y su luz</button>
        <p role="status" className={styles.status}>{message}</p>
      </div>
    </section>
  </main>
}
