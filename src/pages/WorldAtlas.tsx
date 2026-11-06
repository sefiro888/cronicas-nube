import type { CSSProperties, ReactNode } from 'react'
import { SCENARIO_ATLAS, type SceneId } from '../battle/scenarioEnvironments'
import { FACTION_LABELS, FactionSigil } from '../components/FactionSigil'
import { withBase } from '../utils/assets'
import styles from './WorldAtlas.module.css'

// Coordenadas porcentuales de los hitos en la ilustración, con el Nexo libre
// en el centro. Se indexan por escenario para que el catálogo siga dando los nombres.
export const ATLAS_MARKERS: Readonly<Record<SceneId, readonly [number, number]>> = {
  fimbul: [17, 14],
  'lago-kalevala': [48, 10],
  'aether-citadel': [70, 11],
  'acropolis-olimpo': [91, 11],
  grove: [8, 32],
  'bastion-alba': [20, 30],
  foundry: [33, 30],
  'jade-court': [80, 27],
  'wheel-ghat': [92, 38],
  'baluarte-tercios': [25, 47],
  'desguace-goblin': [63, 39],
  'umbral-vacio': [79, 49],
  'bestiary-ravine': [12, 63],
  sanctuary: [50, 59],
  'cripta-plaga': [74, 64],
  'solar-court': [91, 64],
  shore: [14, 82],
  duna: [42, 79],
  caldera: [65, 81],
}

const SCENES = new Map(SCENARIO_ATLAS.map((scene) => [scene.id, scene]))

export function WorldAtlas<T extends SceneId>({ label, markers, selected, onSelect, children }: {
  label: string
  markers: readonly { readonly id: T; readonly state?: string; readonly statusLabel?: string }[]
  selected: T
  onSelect: (id: T) => void
  children?: ReactNode
}) {
  return <nav className={styles.map} aria-label={label}>
    <img className={styles.mapArt} src={withBase('/assets/scenarios/atlas-del-nexo.webp')} width={1881} height={836} alt="" />
    {children}
    {markers.map(({ id, state, statusLabel }) => {
      const entry = SCENES.get(id)!
      const [x, y] = ATLAS_MARKERS[id]
      const name = `${FACTION_LABELS[entry.faction]} ${entry.name}`
      return <button type="button" key={id} className={styles.marker}
        aria-label={statusLabel ? `${name} · ${statusLabel}` : name} aria-pressed={id === selected}
        data-state={state} onClick={() => onSelect(id)}
        style={{ '--map-x': `${x}%`, '--map-y': `${y}%`, '--scene-accent': entry.accent } as CSSProperties}>
        <span className={styles.medallion}><FactionSigil faction={entry.faction} decorative /></span>
        {state === 'cleared' && <span className={styles.seal} aria-hidden="true">✓</span>}
        <span className={styles.markerName}>{entry.name}</span>
      </button>
    })}
  </nav>
}
