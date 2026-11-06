import { useState } from 'react'
import { ATLAS_ROUTE, adventureCommanderName, type AtlasRouteNode } from '../game/adventure'
import { STARTER_DECKS } from '../game/decks'
import { SCENARIO_PRESENTATION } from '../battle/scenarioPresentation'
import { useAdventure, type AdventureRun } from '../store/adventure'
import { ATLAS_MARKERS, WorldAtlas } from './WorldAtlas'
import styles from './AdventurePage.module.css'

const NODES = ['fimbul', 'baluarte-tercios', 'jade-court'] as const
const STATE_LABEL = {
  available: 'Disponible', current: 'Tu posición', cleared: 'Superado', locked: 'Bloqueado', closed: 'Ruta alternativa',
} as const

export function AdventureRoute({ run, deckId, onEnter }: {
  run: AdventureRun | undefined
  deckId: string
  onEnter: () => void
}) {
  const current = run?.routeNode
  const [inspected, setInspected] = useState<AtlasRouteNode>()
  const selected = inspected ?? current ?? 'fimbul'
  const hasFork = current === 'fimbul' && run?.status === 'won'
  const passedFiord = Boolean(run?.wins)
  const nodeState = (node: AtlasRouteNode) => {
    if ((node === 'fimbul' && passedFiord) || (node === current && run?.status === 'complete')) return 'cleared'
    if (node === current) return 'current'
    if (hasFork || (!current && node === 'fimbul')) return 'available'
    return current && current !== 'fimbul' ? 'closed' : 'locked'
  }
  const route = ATLAS_ROUTE[selected]
  const rival = STARTER_DECKS.find((deck) => deck.faction === route.faction)!
  const status = nodeState(selected)
  const markers = NODES.map((id) => {
    const state = nodeState(id)
    return { id, state, statusLabel: STATE_LABEL[state] }
  })
  const [x, y] = ATLAS_MARKERS.fimbul
  return (
    <section className={styles.route} aria-labelledby="ruta-atlas-titulo">
      <header className={styles.routeHeader}>
        <div><span className={styles.eyebrow}>Capítulo piloto · Ruta del sello partido</span>
          <h2 id="ruta-atlas-titulo">Dos caminos desde el Fiordo</h2></div>
        <p role="status">{current
          ? run?.status === 'complete' ? 'Crónica completada'
            : hasFork ? 'Fiordo superado · Elige tu camino' : `Tu posición · ${SCENARIO_PRESENTATION[current].name}`
          : 'La expedición comienza en Fimbul'}</p>
      </header>
      <WorldAtlas label="Mapa de la expedición" markers={markers} selected={selected} onSelect={setInspected}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={styles.routeLines} aria-hidden="true">
          {NODES.slice(1).map((node) => {
            const [endX, endY] = ATLAS_MARKERS[node]
            const state = nodeState(node)
            const path = node === 'baluarte-tercios'
              ? `M ${x} ${y} C 11 27 24 31 ${endX} ${endY}`
              : `M ${x} ${y} C 40 8 51 42 ${endX} ${endY}`
            return <g key={node} data-state={state}>
              <path d={path} strokeWidth="6" className={styles.routeShadow} vectorEffect="non-scaling-stroke" />
              <path d={path} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
            </g>
          })}
        </svg>
      </WorldAtlas>
      <div className={styles.routeBrief}>
        <div>
          <span className={styles.eyebrow}>{SCENARIO_PRESENTATION[selected].name} · {STATE_LABEL[status]}</span>
          <h3>{route.title}</h3>
          <p>{route.story}</p>
          <p><strong>Rival</strong> · {adventureCommanderName(rival.id)} · Nexo rival con {route.health} de Vida inicial
            {route.rivalMandate && ' · El rival comienza con el Mandato'}</p>
          <p><strong>Recompensa</strong> · {route.reward}</p>
        </div>
        <div className={styles.runActions}>
          {!current && selected === 'fimbul' && <button disabled={Boolean(run && run.status !== 'complete')}
            onClick={() => useAdventure.getState().startRoute(deckId)}>Preparar expedición</button>}
          {hasFork && selected !== 'fimbul' && <button onClick={() => useAdventure.getState().chooseRoute(selected)}>Elegir este camino</button>}
          {selected === current && (run?.status === 'ready' || run?.status === 'fighting') &&
            <button onClick={onEnter}>{run.status === 'fighting' ? 'Retomar combate' : 'Entrar en batalla'}</button>}
          {selected === current && run?.status === 'lost' &&
            <button onClick={useAdventure.getState().retry}>Preparar otro intento</button>}
          {hasFork && selected === 'fimbul' && <p>Elige Tercios o Jade en el mapa.</p>}
          {run?.kind === 'route' && <button className={styles.secondary} onClick={() => { useAdventure.getState().abandon(); setInspected(undefined) }}>
            {run.status === 'complete' ? 'Cerrar crónica' : 'Abandonar aventura'}
          </button>}
        </div>
      </div>
    </section>
  )
}
