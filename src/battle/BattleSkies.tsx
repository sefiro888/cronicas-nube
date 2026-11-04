import { useFrame } from '@react-three/fiber'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { AdditiveBlending, BufferGeometry, Color, DoubleSide, Float32BufferAttribute, NormalBlending } from 'three'
import type { AmbientLight, Group, Mesh, MeshBasicMaterial, Points, PointsMaterial } from 'three'
import type { AnimationEvent } from '../game'
import type { GraphicsQuality } from '../store/preferences'
import { creatureKind, damageKind } from './creatureFx'
import { gridToWorldX, gridToWorldZ } from './grid/gridCoordinates'
import { useBattleStrain } from './scenarios/BattleClimate'
import { glowTexture, type BoardTileStyle } from './textures'

/**
 * Lo que rodea al combate: clima, luz de tensión, criaturas lejanas y las
 * cicatrices que deja la batalla en las losas. Todo lee el estado ya
 * resuelto (la tensión de BattleClimate y los eventos que se reproducen);
 * ninguna pieza decide nada de la partida.
 */
export type SkyStyle = BoardTileStyle

/** Golpes que levantan una ráfaga en el clima y espantan a las criaturas lejanas. */
const isHeavy = (event?: AnimationEvent) =>
  Boolean(event && (event.type === 'destroy' || event.type === 'nexus-damage' || (event.type === 'damage' && (event.amount ?? 0) >= 4)))

// ── Clima ────────────────────────────────────────────────────────────────

interface WeatherLook {
  readonly color: string
  readonly count: number
  readonly size: number
  /** Velocidad de caída (negativa = sube). */
  readonly fall: number
  readonly drift: number
  readonly glow: boolean
  readonly streak?: boolean
}

/**
 * Clima de cada escenario. Va además de las motas suaves que ya había
 * (BoardAtmosphere), con más presencia: lluvia en la costa y el santuario,
 * nieve en el fiordo, tormenta de arena en las dunas, ceniza en la caldera,
 * hojas en el claro y pétalos en la corte de jade.
 */
const WEATHER: Readonly<Record<SkyStyle, WeatherLook>> = {
  tide: { color: '#bfe6ff', count: 420, size: 0.05, fall: 9, drift: 1.2, glow: false, streak: true },
  moss: { color: '#c6dcea', count: 300, size: 0.045, fall: 7, drift: 0.6, glow: false, streak: true },
  ice: { color: '#ffffff', count: 380, size: 0.09, fall: 1.1, drift: 0.8, glow: false },
  sand: { color: '#e9cf98', count: 360, size: 0.07, fall: 0.25, drift: 4.5, glow: false },
  sandstone: { color: '#f2d29a', count: 220, size: 0.06, fall: 0.2, drift: 2.2, glow: false },
  basalt: { color: '#ff8a3d', count: 220, size: 0.08, fall: -0.9, drift: 0.5, glow: true },
  forge: { color: '#ffc069', count: 200, size: 0.07, fall: -1.2, drift: 0.4, glow: true },
  forest: { color: '#9cc75a', count: 120, size: 0.12, fall: 0.7, drift: 1.1, glow: false },
  glaze: { color: '#ffb8d0', count: 140, size: 0.11, fall: 0.6, drift: 0.9, glow: false },
  stone: { color: '#ffe6b0', count: 90, size: 0.07, fall: 0.15, drift: 0.4, glow: true },
}

/** Número pseudoaleatorio estable en [0, 1) para una semilla entera. */
const hash = (seed: number) => { const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x) }

const SPAN = 22
const HEIGHT = 12

function Weather({ style, quality, reducedMotion, event }: { style: SkyStyle; quality: GraphicsQuality; reducedMotion: boolean; event?: AnimationEvent }) {
  const look = WEATHER[style]
  const strain = useBattleStrain()
  const count = Math.round(look.count * (quality === 'high' ? 1 : 0.5))
  const points = useRef<Points>(null)
  const gust = useRef(0)
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      // Reparto pseudoaleatorio fijo: Math.random en el render daría otra
      // nube en cada montaje y la regla de pureza de React lo prohíbe.
      positions[i * 3] = (hash(i * 3) - 0.5) * SPAN
      positions[i * 3 + 1] = hash(i * 3 + 1) * HEIGHT
      positions[i * 3 + 2] = (hash(i * 3 + 2) - 0.5) * SPAN
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(positions, 3))
    return g
  }, [count])
  useEffect(() => {
    if (isHeavy(event)) gust.current = 1
  }, [event])
  useFrame((_, delta) => {
    if (reducedMotion || !points.current) return
    const step = Math.min(0.05, delta)
    gust.current = Math.max(0, gust.current - step * 1.4)
    // Con la tensión el clima arrecia; una ráfaga lo empuja hacia fuera.
    const intensity = 0.7 + strain * 0.9
    const attr = geometry.getAttribute('position') as Float32BufferAttribute
    const array = attr.array as Float32Array
    for (let i = 0; i < count; i += 1) {
      const ix = i * 3
      const x = array[ix]!
      const z = array[ix + 2]!
      const push = gust.current * 6 / Math.max(1, Math.hypot(x, z))
      array[ix] = x + (look.drift * intensity + x * push) * step
      array[ix + 1] = array[ix + 1]! - look.fall * intensity * step
      array[ix + 2] = z + (Math.sin(i + array[ix + 1]!) * look.drift * 0.3 + z * push) * step
      if (array[ix + 1]! < 0) array[ix + 1] = HEIGHT
      if (array[ix + 1]! > HEIGHT) array[ix + 1] = 0
      if (array[ix]! > SPAN / 2) array[ix] = -SPAN / 2
      if (array[ix]! < -SPAN / 2) array[ix] = SPAN / 2
      if (Math.abs(array[ix + 2]!) > SPAN / 2) array[ix + 2] = -Math.sign(array[ix + 2]!) * SPAN / 2
    }
    attr.needsUpdate = true
    ;(points.current.material as PointsMaterial).opacity = Math.min(0.95, 0.45 + strain * 0.4)
  })
  if (quality === 'low') return null
  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        map={look.streak ? undefined : glowTexture(look.glow ? 'ember' : 'gold')}
        color={look.color}
        size={look.streak ? look.size * 0.9 : look.size}
        sizeAttenuation
        transparent
        opacity={0.6}
        depthWrite={false}
        blending={look.glow ? AdditiveBlending : NormalBlending}
      />
    </points>
  )
}

// ── Luz de tensión ───────────────────────────────────────────────────────

/**
 * Luz que acompaña a la partida: empieza neutra y, según avanza la tensión
 * (turnos y, sobre todo, Vida del Nexo más tocado), entra un tono de brasa
 * que late cuando la partida está al límite.
 */
function TensionLight({ reducedMotion }: { reducedMotion: boolean }) {
  const strain = useBattleStrain()
  const light = useRef<AmbientLight>(null)
  const color = useMemo(() => new Color(), [])
  useFrame(({ clock }) => {
    if (!light.current) return
    const pulse = strain > 0.7 && !reducedMotion ? 0.5 + 0.5 * Math.sin(clock.elapsedTime * 3) : 0
    color.set('#ffb070').lerp(new Color('#ff3a20'), Math.max(0, (strain - 0.5) * 2))
    light.current.color.copy(color)
    light.current.intensity = strain * 0.45 + pulse * 0.25
  })
  return <ambientLight ref={light} intensity={0} />
}

// ── Criaturas lejanas ────────────────────────────────────────────────────

/**
 * Siluetas que vuelan en círculos lejos del tablero (aves o dragones según
 * la escena). Con cada golpe fuerte se espantan y aceleran un rato.
 */
function DistantFlyers({ style, reducedMotion, event }: { style: SkyStyle; reducedMotion: boolean; event?: AnimationEvent }) {
  const flock = useRef<Group>(null)
  const scare = useRef(0)
  const dragons = style === 'basalt' || style === 'forge' || style === 'stone'
  const flyers = useMemo(() => Array.from({ length: dragons ? 3 : 6 }, (_, i) => ({
    radius: 15 + (i % 3) * 2.5, height: 7 + (i % 4) * 1.1, speed: 0.06 + (i % 3) * 0.02, phase: i * 1.7, size: dragons ? 1.1 + (i % 2) * 0.4 : 0.35 + (i % 3) * 0.1,
  })), [dragons])
  useEffect(() => {
    if (isHeavy(event)) scare.current = 1
  }, [event])
  useFrame(({ clock }, delta) => {
    if (!flock.current) return
    scare.current = Math.max(0, scare.current - Math.min(0.05, delta) * 0.4)
    const t = reducedMotion ? 0 : clock.elapsedTime
    flock.current.children.forEach((child, i) => {
      const f = flyers[i]!
      const angle = f.phase + t * f.speed * (1 + scare.current * 3)
      child.position.set(Math.cos(angle) * f.radius, f.height + scare.current * 2 + Math.sin(t * 0.7 + i) * 0.4, Math.sin(angle) * f.radius - 4)
      child.rotation.y = -angle
      // Aleteo: las alas suben y bajan; espantadas, más deprisa.
      const flap = Math.sin(t * (dragons ? 3 : 9) * (1 + scare.current) + i)
      child.children.forEach((wing, side) => { wing.rotation.x = (side ? 1 : -1) * flap * 0.6 })
    })
  })
  return (
    <group ref={flock}>
      {flyers.map((f, i) => (
        <group key={i} scale={f.size}>
          {[0, 1].map((side) => (
            <mesh key={side} position={[0, 0, side ? 0.5 : -0.5]}>
              <planeGeometry args={[0.6, 1]} />
              <meshBasicMaterial color="#120e0c" transparent opacity={0.75} side={DoubleSide} depthWrite={false} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

// ── Cicatrices del tablero ───────────────────────────────────────────────

interface Scar {
  readonly id: string
  readonly x: number
  readonly z: number
  readonly kind: 'burn' | 'frost' | 'crater' | 'stain' | 'ooze'
  readonly turn: number
  readonly rotation: number
}

/** Cuántos turnos tarda en borrarse una marca. */
const SCAR_TURNS = 4
const SCAR_LIMIT = 40

const SCAR_LOOK: Readonly<Record<Scar['kind'], { readonly color: string; readonly size: number; readonly glow?: boolean }>> = {
  burn: { color: '#1a0f08', size: 0.95 },
  frost: { color: '#bfeaff', size: 0.9, glow: true },
  crater: { color: '#2a221a', size: 1.05 },
  stain: { color: '#4a0f0c', size: 0.7 },
  ooze: { color: '#3d6a1c', size: 0.75 },
}

let scarId = 0

/**
 * Marcas que la batalla deja en las losas: quemaduras del fuego, escarcha
 * del hielo, cráteres de los mazazos y manchas donde cayó una criatura. Se
 * borran poco a poco en unos turnos para no ensuciar el tablero para siempre.
 */
function BattleScars({ event, turn }: { event?: AnimationEvent; turn: number }) {
  const [scars, setScars] = useState<readonly Scar[]>([])
  useEffect(() => {
    if (!event?.to) return
    let kind: Scar['kind'] | undefined
    if (event.type === 'damage') {
      const damage = damageKind(event)
      kind = damage === 'fire' ? 'burn' : damage === 'ice' ? 'frost' : damage === 'poison' ? 'ooze' : (event.amount ?? 0) >= 4 ? 'crater' : undefined
    } else if (event.type === 'destroy') {
      const creature = creatureKind(event.cardId)
      kind = creature === 'flesh' ? 'stain' : creature === 'plant' ? 'ooze' : 'crater'
    } else if (event.type === 'freeze') {
      kind = 'frost'
    }
    if (!kind) return
    const scar: Scar = { id: `scar-${scarId++}`, x: gridToWorldX(event.to.x), z: gridToWorldZ(event.to.y), kind, turn, rotation: Math.random() * Math.PI * 2 }
    const timer = window.setTimeout(() => setScars((list) => [...list.filter((s) => turn - s.turn < SCAR_TURNS), scar].slice(-SCAR_LIMIT)), 0)
    return () => window.clearTimeout(timer)
  }, [event, turn])
  return (
    <group>
      {scars.map((scar) => {
        const look = SCAR_LOOK[scar.kind]
        const age = Math.max(0, turn - scar.turn)
        const opacity = Math.max(0, 1 - age / SCAR_TURNS) * (look.glow ? 0.45 : 0.6)
        if (opacity <= 0) return null
        return (
          <mesh key={scar.id} position={[scar.x, 0.175, scar.z]} rotation={[-Math.PI / 2, 0, scar.rotation]} renderOrder={2}>
            <planeGeometry args={[look.size, look.size]} />
            <meshBasicMaterial map={glowTexture(look.glow ? 'arcane' : 'shadow')} color={look.color} transparent opacity={opacity}
              depthWrite={false} blending={look.glow ? AdditiveBlending : NormalBlending} />
          </mesh>
        )
      })}
    </group>
  )
}

/** Paso sobre la losa: un anillo de polvo y motas al llegar una unidad (casillas vivas). */
export function StepRipple({ at, tone, durationMs }: { at: readonly [number, number]; tone: string; durationMs: number }) {
  const ring = useRef<Mesh>(null)
  const start = useRef<number | null>(null)
  useFrame(() => {
    if (start.current === null) start.current = performance.now()
    const t = Math.min(1, (performance.now() - start.current) / Math.max(300, durationMs))
    // Llega al final del movimiento: el polvo se levanta al pisar, no al salir.
    const k = Math.max(0, (t - 0.6) / 0.4)
    if (ring.current) {
      ring.current.visible = k > 0 && k < 1
      ring.current.scale.setScalar(0.4 + k * 1.3)
      ;(ring.current.material as MeshBasicMaterial).opacity = (1 - k) * 0.6
    }
  })
  return (
    <mesh ref={ring} position={[at[0], 0.18, at[1]]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.3, 0.45, 32]} />
      <meshBasicMaterial color={tone} transparent opacity={0} depthWrite={false} side={DoubleSide} />
    </mesh>
  )
}

export const BattleSkies = memo(function BattleSkies({ style, quality, reducedMotion, event, turn }: {
  style: SkyStyle; quality: GraphicsQuality; reducedMotion: boolean; event?: AnimationEvent; turn: number
}) {
  return (
    <>
      <Weather style={style} quality={quality} reducedMotion={reducedMotion} event={event} />
      <TensionLight reducedMotion={reducedMotion} />
      {quality !== 'low' && <DistantFlyers style={style} reducedMotion={reducedMotion} event={event} />}
      <BattleScars event={event} turn={turn} />
    </>
  )
})
