import { Html } from '@react-three/drei'
import { memo, useEffect, type CSSProperties } from 'react'
import type { AnimationEvent } from '../game'
import { KeywordGlyph, keywordIdentity, keywordStyle } from '../components/keywordIdentity'
import type { CastImpact, ImpactChange } from './castImpact'
import { gridToWorldX, gridToWorldZ } from './grid/gridCoordinates'
import { useTransientEntries } from './useTransientEntries'
import styles from './ImpactMarks.module.css'

interface Mark {
  readonly id: string
  readonly x: number
  readonly z: number
  readonly changes: readonly ImpactChange[]
  /** Orden de aparición: la onda recorre las unidades una tras otra. */
  readonly order: number
  readonly power: boolean
}

/** Debe casar con la animación de ImpactMarks.module.css. */
const MARK_MS = 2600
/**
 * Por encima de la ficha pero por debajo de los números de daño (2,0). A 2,6
 * las marcas de tres goblins vecinos subían hasta la mitad rival del tablero
 * y se montaban unas sobre otras.
 */
const MARK_HEIGHT = 1.5

/**
 * Lo que ya cuentan otros efectos no se repite aquí: el daño lo enseñan los
 * números flotantes, la muerte las brasas y la entrada el aterrizaje.
 * Quedan justo los cambios que antes no se veían en ningún sitio.
 */
const SHOWN = (change: ImpactChange) =>
  !/Vida$/.test(change.label) && change.label !== 'Destruida' && change.label !== 'Entra en juego' && change.label !== 'Desplazada'

let nextId = 0

/**
 * Marcas sobre cada ficha a la que afecta una carta o un poder: «+Petardazo»,
 * «Congelada», «Escudo 2»… con el icono y color del término. Existen porque
 * un poder como «Todas tus unidades ganan Petardazo» no cambiaba nada visible
 * en el tablero y no había forma de saber a quién había afectado.
 */
export const ImpactMarks = memo(function ImpactMarks({ event, impact, reducedMotion = false }: {
  event?: AnimationEvent
  impact?: CastImpact
  reducedMotion?: boolean
}) {
  const { entries, append } = useTransientEntries<Mark>(MARK_MS)

  useEffect(() => {
    if (!event?.cast || !impact) return
    let order = 0
    for (const piece of impact.pieces) {
      const changes = piece.changes.filter(SHOWN)
      if (changes.length === 0) continue
      append({
        id: `mark-${nextId++}`,
        x: gridToWorldX(piece.position.x),
        z: gridToWorldZ(piece.position.y),
        changes,
        order: order++,
        power: event.cast.kind === 'power',
      })
    }
  }, [event, impact, append])

  return (
    <group>
      {entries.map((mark) => (
        <Html key={mark.id} center position={[mark.x, MARK_HEIGHT, mark.z]} distanceFactor={8} zIndexRange={[17, 0]}>
          <div
            className={styles.mark}
            data-power={mark.power || undefined}
            data-reduced-motion={reducedMotion || undefined}
            style={{ '--order': mark.order } as CSSProperties}
          >
            <span className={styles.burst} />
            {mark.changes.map((change) => {
              const identity = change.glossaryId ? keywordIdentity(change.glossaryId) : undefined
              return (
                <span
                  key={change.label}
                  className={styles.chip}
                  data-tone={change.tone}
                  style={change.glossaryId ? keywordStyle(change.glossaryId) : undefined}
                >
                  {identity && <KeywordGlyph glyph={identity.glyph} className={styles.glyph} />}
                  {change.label}
                </span>
              )
            })}
          </div>
        </Html>
      ))}
    </group>
  )
})
