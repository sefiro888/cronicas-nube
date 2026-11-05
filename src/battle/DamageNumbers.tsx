import { Html } from '@react-three/drei'
import { memo, useEffect } from 'react'
import type { CSSProperties } from 'react'
import type { AnimationEvent } from '../game'
import { gridToWorldX, gridToWorldZ, NEXUS_WORLD } from './grid/gridCoordinates'
import styles from './DamageNumbers.module.css'
import { useTransientEntries } from './useTransientEntries'
import { CRITICAL_DAMAGE, damageKind, type DamageKind } from './creatureFx'
import { periodicEffect, protectionEffect } from './resolvedEffects'

interface FloatingNumber {
  readonly id: string
  readonly x: number
  readonly z: number
  readonly value: number
  readonly color: 'damage' | 'heal' | 'shield'
  /** Tamaño relativo del número, creciente con la cantidad (ver `scaleFor`). */
  readonly scale: number
  /** Tipo de daño: cada uno con su color, icono y forma de subir. */
  readonly kind: DamageKind
  readonly critical: boolean
  readonly caption?: string
  readonly absorbed?: boolean
}

/**
 * Icono delante de la cifra. Antes todos los números eran el mismo rojo y
 * no se distinguía una quemadura de una congelación ni de un veneno.
 */
const KIND_ICON: Readonly<Record<DamageKind, string>> = {
  physical: '', fire: '🔥', ice: '❄', poison: '☠', shadow: '◆', arcane: '✦',
}

/**
 * Escala continua según la cantidad: antes solo los golpes de 4+ se veían
 * distintos de un pinchazo de 1, así que la inmensa mayoría de los combates
 * (la mayoría de las unidades pegan 1-3) no notaban NINGÚN cambio respecto a
 * la versión de siempre. Ahora todo golpe crece un poco, y uno grande de
 * verdad destaca mucho más.
 */
const scaleFor = (amount: number): number => Math.min(2.1, 1 + amount * 0.16)

/** Cuánto dura la subida del número, en milisegundos. Debe casar con el CSS. */
const FLOAT_MS = 1200
/** A1,0 el número atravesaba la chapa; a1,7 el golpe grande aún la rozaba
 * 5,6px a1366. A2,0 conserva margen sin desplazar nombres ni estadísticas. */
const SPAWN_HEIGHT = 2.0

let nextId = 0

/**
 * Números flotantes de daño, curación y escudo sobre la casilla afectada.
 *
 * Dos arreglos respecto a la primera versión:
 *
 * 1. Salían en el sitio equivocado. La posición era `[x, z + subida, 0]`, que
 *    usa la coordenada Z del tablero como ALTURA y deja la profundidad fija en
 *    0 — el número aparecía flotando sobre la fila central del tablero y a una
 *    altura proporcional a la fila, en vez de encima de la ficha golpeada.
 * 2. No se movían. El progreso se leía con `performance.now()` durante el
 *    render y la lista vivía en un ref, así que la animación solo avanzaba
 *    cuando React volvía a renderizar por otro motivo. Ahora la subida y el
 *    desvanecido los hace el CSS, que va por su cuenta y no cuesta renders.
 */
export const DamageNumbers = memo(function DamageNumbers({ event, reducedMotion = false }: { event?: AnimationEvent; reducedMotion?: boolean }) {
  const { entries: numbers, append } = useTransientEntries<FloatingNumber>(FLOAT_MS)

  useEffect(() => {
    if (!event) return
    if (event.type !== 'damage' && event.type !== 'shield' && event.type !== 'nexus-damage') return
    const value = event.amount ?? 0
    if (value <= 0) return
    // El golpe al Nexo no lleva `to` (no es una casilla del tablero): se
    // ubica por el propio id del Nexo, que ya coincide con las claves de
    // NEXUS_WORLD (`player-nexus`/`ai-nexus`). Antes este evento no tenía
    // NINGÚN número flotante — solo el destello 3D del Nexo (`NexusShock`),
    // que pasaba fácilmente desapercibido.
    const position = event.type === 'nexus-damage'
      ? (event.targetId ? NEXUS_WORLD[event.targetId] : undefined)
      : event.to && [gridToWorldX(event.to.x), gridToWorldZ(event.to.y)] as const
    if (!position) return
    const protection = event.type === 'shield' ? protectionEffect(event) : undefined
    const entry: FloatingNumber = {
      id: `num-${nextId++}`,
      x: position[0],
      z: position[1],
      value,
      color: protection === 'vitality' ? 'heal' : protection ? 'shield' : 'damage',
      scale: scaleFor(value) * (value >= CRITICAL_DAMAGE ? 1.25 : 1),
      kind: event.type === 'shield' ? 'physical' : damageKind(event),
      critical: event.type !== 'shield' && value >= CRITICAL_DAMAGE,
      absorbed: protection === 'absorb',
      caption: protection === 'absorb' ? 'Bloqueado' : protection === 'grant' ? 'Escudo' : protection === 'vitality' ? 'Aura vital' : periodicEffect(event),
    }
    append(entry)
  }, [event, append])

  return (
    <group>
      {numbers.map((num) => (
        <Html key={num.id} center position={[num.x, SPAWN_HEIGHT, num.z]} distanceFactor={8} zIndexRange={[16, 0]}>
          <div className={styles.number} data-color={num.color} data-kind={num.kind} data-critical={num.critical || undefined} data-reduced-motion={reducedMotion || undefined} style={{ '--num-scale': num.scale } as CSSProperties}>
            {num.critical && <span className={styles.critLabel}>¡Crítico!</span>}
            {num.caption && <span className={styles.effectCaption}>{num.caption}</span>}
            {KIND_ICON[num.kind] && <span className={styles.kindIcon}>{KIND_ICON[num.kind]}</span>}
            {num.absorbed ? '⛨ ' : num.color === 'damage' ? '−' : '+'}{num.value}
          </div>
        </Html>
      ))}
    </group>
  )
})
