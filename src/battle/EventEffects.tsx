import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, DoubleSide, MathUtils } from 'three'
import type { Group, Mesh, MeshBasicMaterial, PointLight, Sprite } from 'three'
import type { AnimationEvent, FactionId, Position } from '../game'
import { CARD_BY_ID } from '../game'
import {
  gridToWorldX as boardX,
  gridToWorldZ as boardZ,
  NEXUS_WORLD as NEXUS_POSITION,
} from './grid/gridCoordinates'
import { glowTexture, type GlowTint } from './textures'
import { RitualSeal } from './RitualSeal'
import { AttackTrail } from './AttackTrail'
import { ArrowVolley, BarbVolley, ClawStrike, CrushStrike, DragonBreath, GunShot, LightningBolt, SlashStrike, SpectralStrike } from './AttackStyles'
import { attackKindFor, attackWeight } from './attackStyle'
import { DeathFlourish, HitSpill } from './CreatureReactions'
import { ImpactDebris, materialOf } from './ImpactDebris'
import { ARRIVAL_LANDING } from './arrivalMotion'

/** Color y textura de brillo por facción — a juego con `accentColor` en `factions.ts`. */
const FACTION_TONE: Readonly<Record<FactionId, { readonly color: string; readonly glow: GlowTint }>> = {
  fury: { color: '#ff8a3d', glow: 'ember' },
  arcane: { color: '#79c8ff', glow: 'arcane' },
  nature: { color: '#a7db67', glow: 'nature' },
  order: { color: '#f2cf68', glow: 'gold' },
  shadow: { color: '#b98ee0', glow: 'shadow' },
  void: { color: '#c775ff', glow: 'void' },
  duna: { color: '#ffd76a', glow: 'gold' },
  fimbul: { color: '#d8a944', glow: 'ember' },
  samsara: { color: '#ffd27a', glow: 'ember' },
  jade: { color: '#f2c14e', glow: 'ember' },
  olimpo: { color: '#cf9b3f', glow: 'ember' },
  sol: { color: '#f5c33b', glow: 'ember' },
  bestiario: { color: '#c9932e', glow: 'ember' },
  plaga: { color: '#b8481f', glow: 'ember' },
  marea: { color: '#2f8f9d', glow: 'arcane' },
  forja: { color: '#ffb347', glow: 'ember' },
  goblins: { color: '#ffd34d', glow: 'ember' },
  tercios: { color: '#d9b775', glow: 'gold' },
  kalevala: { color: '#dfa448', glow: 'arcane' },
}

/**
 * Deduce el tono cromático del efecto. Con la facción real del evento (solo
 * disponible al invocar, ver `AnimationEvent.faction`) el color es exacto;
 * para el resto de eventos (ataques, impactos...) se mantiene el heurístico
 * por palabras clave del `effectId` de antes — un cubo de 4 tonos que, para
 * lo que hace (aproximar sin datos mejores), sigue sirviendo.
 */
const toneOf = (effectId?: string, faction?: FactionId): string => {
  if (faction) return FACTION_TONE[faction].color
  const id = effectId ?? ''
  if (/(frost|ice|glacial|freeze|escarcha)/.test(id)) return '#a8ecff'
  if (/(fire|ember|fury|magma|caldera|ash|forge|rage|cinder|slag|basalt|siege|eruption|volcanic|heat)/.test(id)) return '#ff8a3d'
  if (/(arcane|rune|crystal|comet|glyph|time|mirror|astral|water|azur|library|portal|horizon|prism)/.test(id)) return '#79c8ff'
  return '#e9c474'
}

const glowFor = (tone: string): ReturnType<typeof glowTexture> => {
  const byFaction = Object.values(FACTION_TONE).find((entry) => entry.color === tone)
  if (byFaction) return glowTexture(byFaction.glow)
  return tone === '#ff8a3d' ? glowTexture('ember') : tone === '#e9c474' ? glowTexture('gold') : glowTexture('arcane')
}

interface TimedProps {
  readonly durationMs: number
  readonly reducedMotion: boolean
}

const useProgress = ({ durationMs, reducedMotion }: TimedProps) => {
  const start = useRef<number | null>(null)
  const progress = useRef(reducedMotion ? 1 : 0)
  useFrame(() => {
    if (reducedMotion) return
    if (start.current === null) start.current = performance.now()
    progress.current = MathUtils.clamp((performance.now() - start.current) / Math.max(1, durationMs), 0, 1)
  })
  return progress
}

/** El trazado aparece en el suelo y levanta motas: el arte queda despejado. */
function SummonRitual({ cell, tone, timing, faction }: { cell: Position; tone: string; timing: TimedProps; faction?: FactionId }) {
  const progress = useProgress(timing)
  const particles = useRef<Group>(null)
  const light = useRef<PointLight>(null)
  const texture = useMemo(() => glowFor(tone), [tone])
  useFrame(() => {
    const value = progress.current
    const fade = Math.sin(value * Math.PI)
    if (light.current) light.current.intensity = fade * 2.5
    particles.current?.children.forEach((particle, index) => {
      const angle = index * 2.39996 + value * 0.28
      const radius = 0.32 + (index % 3) * 0.12
      particle.position.set(Math.cos(angle) * radius, value * (0.7 + (index % 4) * 0.16), Math.sin(angle) * radius)
      particle.scale.setScalar((0.045 + (index % 3) * 0.012) * fade)
      ;(particle as Sprite).material.opacity = fade * 0.8
    })
  })
  if (timing.reducedMotion) return null
  return (
    <>
    <RitualSeal cell={cell} tone={tone} faction={faction} durationMs={timing.durationMs} reducedMotion={timing.reducedMotion} />
    <group position={[boardX(cell.x), 0, boardZ(cell.y)]}>
      <group ref={particles}>{Array.from({ length: 12 }, (_, index) => <sprite key={index}>
        <spriteMaterial map={texture} color={tone} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} />
      </sprite>)}</group>
      <pointLight ref={light} position={[0, 0.6, 0]} color={tone} intensity={0} distance={2.5} decay={2} />
    </group>
    </>
  )
}

/** Direcciones fijas del polvo: aleatorias cambiarían en cada render y temblarían. */
const DUST = Array.from({ length: 16 }, (_, index) => {
  const angle = (index / 16) * Math.PI * 2 + (index % 2) * 0.2
  return { x: Math.cos(angle), z: Math.sin(angle), reach: 0.75 + (index % 3) * 0.22, rise: 0.18 + (index % 4) * 0.07 }
})

/**
 * Aterrizaje de una unidad: onda en el suelo, polvo que se abre en corona,
 * columna de luz de su facción y un destello corto. Todo arranca en
 * `ARRIVAL_LANDING`, el instante en que la pieza toca la losa; antes de eso
 * solo se ve la caída, para que el golpe se sienta como consecuencia de ella.
 */
function LandingShock({ cell, tone, timing, heavy }: { cell: Position; tone: string; timing: TimedProps; heavy: boolean }) {
  const progress = useProgress(timing)
  const ring = useRef<Mesh>(null)
  const ring2 = useRef<Mesh>(null)
  const pillar = useRef<Mesh>(null)
  const dust = useRef<Group>(null)
  const light = useRef<PointLight>(null)
  const glow = useMemo(() => glowFor(tone), [tone])
  const dustTexture = useMemo(() => glowTexture('gold'), [])
  const size = heavy ? 1.35 : 1
  useFrame(() => {
    const local = (progress.current - ARRIVAL_LANDING) / (1 - ARRIVAL_LANDING)
    const on = local >= 0 && local <= 1
    const value = MathUtils.clamp(local, 0, 1)
    const fade = 1 - value
    if (ring.current) {
      ring.current.visible = on
      ring.current.scale.setScalar((0.3 + Math.pow(value, 0.6) * 2.1) * size)
      ;(ring.current.material as MeshBasicMaterial).opacity = fade * fade * 0.95
    }
    if (ring2.current) {
      ring2.current.visible = on && value > 0.08
      ring2.current.scale.setScalar((0.2 + Math.pow(Math.max(0, value - 0.08), 0.7) * 1.4) * size)
      ;(ring2.current.material as MeshBasicMaterial).opacity = fade * 0.6
    }
    if (pillar.current) {
      pillar.current.visible = on
      pillar.current.scale.set(1 - value * 0.6, 0.4 + value * 1.6, 1 - value * 0.6)
      ;(pillar.current.material as MeshBasicMaterial).opacity = Math.pow(fade, 2.5) * 0.55
    }
    if (light.current) light.current.intensity = on ? Math.pow(fade, 3) * (heavy ? 7 : 5) : 0
    dust.current?.children.forEach((puff, index) => {
      const spec = DUST[index]!
      const reach = Math.pow(value, 0.45) * spec.reach * size
      puff.visible = on
      puff.position.set(spec.x * reach, 0.05 + spec.rise * Math.sin(value * Math.PI * 0.8), spec.z * reach)
      puff.scale.setScalar((0.16 + value * 0.32) * size)
      ;(puff as Sprite).material.opacity = fade * 0.55
    })
  })
  if (timing.reducedMotion) return null
  return (
    <group position={[boardX(cell.x), 0.14, boardZ(cell.y)]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.36, 0.46, 48]} />
        <meshBasicMaterial color={tone} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
      </mesh>
      <mesh ref={ring2} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.4, 0.44, 48]} />
        <meshBasicMaterial color="#fff4d8" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
      </mesh>
      <mesh ref={pillar} position={[0, 0.7, 0]} visible={false}>
        <cylinderGeometry args={[0.32, 0.42, 1.4, 24, 1, true]} />
        <meshBasicMaterial color={tone} map={glow} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
      </mesh>
      <group ref={dust}>
        {DUST.map((_, index) => (
          <sprite key={index} visible={false}>
            <spriteMaterial map={dustTexture} color="#b7a588" transparent opacity={0} depthWrite={false} />
          </sprite>
        ))}
      </group>
      <pointLight ref={light} position={[0, 0.45, 0]} color={tone} intensity={0} distance={3.4} decay={2} />
    </group>
  )
}

/**
 * Estallido de impacto: anillo expansivo, chispas y golpe de luz.
 *
 * `power` (0-1) escala la intensidad de forma continua según la cantidad de
 * daño (ver `powerFor` en el switch de abajo) — antes era un booleano `big`
 * que solo distinguía "4 de daño o más" del resto, así que la inmensa
 * mayoría de los golpes (la mayoría de las unidades pegan 1-3) se veían
 * SIEMPRE con la versión mínima, indistinguible entre un rasguño y un golpe
 * decente. Ahora todo golpe se nota un poco más, y uno grande de verdad
 * sigue destacando por encima.
 */
function ImpactBurst({ cell, tone, timing, power = 0 }: { cell: readonly [number, number]; tone: string; timing: TimedProps; power?: number }) {
  const progress = useProgress(timing)
  const ring = useRef<Mesh>(null)
  const sparks = useRef<Group>(null)
  const light = useRef<PointLight>(null)
  const texture = useMemo(() => glowFor(tone), [tone])
  const sparkCount = 7 + Math.round(power * 3)
  const directions = useMemo(
    () =>
      Array.from({ length: sparkCount }, (_, index) => {
        const angle = (index / sparkCount) * Math.PI * 2 + 0.4
        return [Math.cos(angle), 0.5 + (index % 3) * 0.28, Math.sin(angle)] as const
      }),
    [sparkCount],
  )
  useFrame(() => {
    const value = progress.current
    const fade = 1 - value
    if (ring.current) {
      ring.current.scale.setScalar(0.25 + value * (1.6 + power * 0.8))
      ;(ring.current.material as MeshBasicMaterial).opacity = fade * 0.9
    }
    // Un destello largo blanqueaba la ilustración: la energía queda en el
    // primer instante y después se leen los fragmentos y la recuperación.
    if (light.current) light.current.intensity = Math.pow(fade, 4) * (3.5 + power * 4)
    sparks.current?.children.forEach((spark, index) => {
      const direction = directions[index]!
      const reach = value * (1 + power * 0.6)
      spark.position.set(direction[0] * reach, direction[1] * reach * 0.8, direction[2] * reach)
      spark.scale.setScalar(Math.max(0.001, (1 - value) * (0.1 + power * 0.06)))
      ;(spark as Sprite).material.opacity = fade * fade * 0.8
    })
  })
  if (timing.reducedMotion) return null
  return (
    <group position={[cell[0], 0.16, cell[1]]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.42, 36]} />
        <meshBasicMaterial color={tone} transparent opacity={0.9} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
      </mesh>
      <group ref={sparks}>
        {directions.map((_, index) => (
          <sprite key={index}>
            <spriteMaterial map={texture} transparent blending={AdditiveBlending} depthWrite={false} />
          </sprite>
        ))}
      </group>
      <pointLight ref={light} position={[0, 0.5, 0]} color={tone} intensity={0} distance={3.2} decay={2} />
    </group>
  )
}

/** Floración de hielo al congelar una unidad. */
function FreezeBloom({ cell, timing }: { cell: Position; timing: TimedProps }) {
  const progress = useProgress(timing)
  const group = useRef<Group>(null)
  useFrame(() => {
    const value = progress.current
    const grow = Math.min(1, value * 1.6)
    const fade = value > 0.7 ? (1 - value) / 0.3 : 1
    group.current?.children.forEach((child, index) => {
      child.scale.setScalar(Math.max(0.001, grow * (0.7 + (index % 3) * 0.2)))
      const material = (child as Mesh).material as MeshBasicMaterial
      material.opacity = 0.75 * fade
    })
  })
  if (timing.reducedMotion) return null
  const spikes = [0, 1, 2, 3, 4]
  return (
    <group ref={group} position={[boardX(cell.x), 0.1, boardZ(cell.y)]}>
      {spikes.map((index) => {
        const angle = (index / spikes.length) * Math.PI * 2
        return (
          <mesh key={index} position={[Math.cos(angle) * 0.32, 0.16, Math.sin(angle) * 0.32]} rotation={[Math.PI * 0.06 * Math.cos(angle), 0, Math.PI * 0.06 * Math.sin(angle)]}>
            <coneGeometry args={[0.09, 0.5, 5]} />
            <meshBasicMaterial color="#bdf1ff" transparent opacity={0.75} blending={AdditiveBlending} depthWrite={false} />
          </mesh>
        )
      })}
    </group>
  )
}

/** Ascuas que ascienden cuando una carta es destruida. */
function DestroyEmbers({ cell, tone, timing, cardId }: { cell: Position; tone: string; timing: TimedProps; cardId?: string }) {
  const progress = useProgress(timing)
  const group = useRef<Group>(null)
  const ring = useRef<Mesh>(null)
  const flash = useRef<PointLight>(null)
  const texture = useMemo(() => glowFor(tone), [tone])
  const material = materialOf(cardId)
  const physical = material === 'metal' || material === 'crystal'
  // Más pavesas y con reparto irregular: nueve en ángulos regulares se leían
  // como una fuente ordenada, no como algo que revienta.
  const seeds = useMemo(
    () => Array.from({ length: physical ? 7 : 16 }, (_, index) => {
      const angle = index * 2.399 + (index % 3) * 0.4
      const reach = 0.26 + (index % 5) * 0.12
      return {
        x: Math.cos(angle) * reach,
        z: Math.sin(angle) * reach,
        speed: 0.6 + (index % 4) * 0.34,
        size: 0.2 + (index % 3) * 0.09,
      }
    }),
    [physical],
  )
  useFrame(() => {
    const value = progress.current
    // Reparto hacia fuera muy rápido al principio y luego casi parado: es lo
    // que separa una explosión de un chorro constante.
    const burst = 1 - Math.pow(1 - value, 3)
    group.current?.children.forEach((child, index) => {
      const seed = seeds[index]!
      child.position.set(
        seed.x * (0.4 + burst * 2.1),
        0.18 + value * seed.speed * 1.5,
        seed.z * (0.4 + burst * 2.1),
      )
      child.scale.setScalar(Math.max(0.001, (1 - value) * seed.size))
    })
    if (ring.current) {
      // Onda de choque a ras de suelo: se abre y se apaga antes que las pavesas.
      const anillo = Math.min(1, value * 2.2)
      ring.current.scale.setScalar(0.3 + anillo * 2.6)
      ;(ring.current.material as MeshBasicMaterial).opacity = Math.max(0, 1 - anillo) * 0.7
    }
    // Destello: solo en el primer tercio, si no parece una hoguera encendida.
    // Un fogonazo de 22 blanqueaba la ilustración incluso con la cámara normal.
    if (flash.current) flash.current.intensity = Math.max(0, 1 - value * 3) * 8
  })
  if (timing.reducedMotion) return null
  return (
    <group position={[boardX(cell.x), 0, boardZ(cell.y)]}>
      <mesh ref={ring} position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.28, 0.42, 32]} />
        <meshBasicMaterial color={tone} transparent opacity={0.7} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
      </mesh>
      <pointLight ref={flash} position={[0, 0.5, 0]} color={tone} intensity={8} distance={4.2} decay={2} />
      <group ref={group}>
        {seeds.map((_, index) => (
          <sprite key={index}>
            <spriteMaterial map={texture} transparent opacity={physical ? 0.55 : 1} blending={AdditiveBlending} depthWrite={false} />
          </sprite>
        ))}
      </group>
    </group>
  )
}

/** Onda expansiva sobre un Nexo herido. */
function NexusShock({ at, tone, timing }: { at: readonly [number, number]; tone: string; timing: TimedProps }) {
  const progress = useProgress(timing)
  const ring = useRef<Mesh>(null)
  const light = useRef<PointLight>(null)
  useFrame(() => {
    const value = progress.current
    const fade = 1 - value
    if (ring.current) {
      ring.current.scale.setScalar(0.3 + value * 3)
      ;(ring.current.material as MeshBasicMaterial).opacity = fade
    }
    if (light.current) light.current.intensity = fade * 34
  })
  if (timing.reducedMotion) return null
  return (
    <group position={[at[0], 0.45, at[1]]}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.5, 0.66, 42]} />
        <meshBasicMaterial color={tone} transparent opacity={1} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
      </mesh>
      <pointLight ref={light} color={tone} intensity={34} distance={7} decay={2} />
    </group>
  )
}

interface EventEffectsProps {
  readonly event: AnimationEvent
  readonly reducedMotion: boolean
}

/**
 * Traduce un AnimationEvent ya resuelto por el motor en su efecto visual.
 * Nunca decide reglas: solo representa lo que el motor ya decidió.
 */
/** Intensidad continua (0-1) del destello de impacto según el daño real repartido. */
const powerFor = (amount?: number): number => Math.max(0, Math.min(1, ((amount ?? 0) - 1) / 5))

/**
 * Plus de espectáculo por rareza de quien golpea. El propietario pidió que
 * cada rareza se sintiera distinta en cualquier acción: un golpe de una
 * mítica tiene que estallar más que el de una común aunque haga el mismo
 * daño. Se suma a la potencia por cantidad, que sigue mandando.
 */
const RARITY_POWER: Readonly<Record<string, number>> = { common: 0, uncommon: 0.15, rare: 0.4, mythic: 0.75 }
const rarityPower = (cardId?: string): number => RARITY_POWER[cardId ? CARD_BY_ID[cardId]?.rarity ?? 'common' : 'common'] ?? 0

export function EventEffects({ event, reducedMotion }: EventEffectsProps) {
  const timing: TimedProps = { durationMs: event.durationMs, reducedMotion }
  const tone = toneOf(event.effectId, event.faction)
  const card = event.cardId ? CARD_BY_ID[event.cardId] : undefined
  switch (event.type) {
    case 'summon':
      return event.to ? (
        <>
          <SummonRitual cell={event.to} tone={tone} timing={timing} faction={event.faction} />
          <LandingShock cell={event.to} tone={tone} timing={timing} heavy={Boolean(event.cast)} />
        </>
      ) : null
    case 'attack': {
      if (reducedMotion) return null
      const target = event.targetId ? NEXUS_POSITION[event.targetId] : undefined
      const from: readonly [number, number] | undefined = event.from ? [boardX(event.from.x), boardZ(event.from.y)] : undefined
      const to: readonly [number, number] | undefined = event.to ? [boardX(event.to.x), boardZ(event.to.y)] : target
      const melee = card ? (card.range ?? 1) <= 1 : Boolean(from && to && Math.hypot(to[0] - from[0], to[1] - from[1]) < 1.9)
      if (!from || !to) return null
      // Cada tipo de criatura golpea a su manera (ver attackStyle.ts); el
      // arco con estela queda para los proyectiles mágicos.
      const style = { from, to, tone, durationMs: event.durationMs, weight: attackWeight(card?.attack) }
      switch (attackKindFor(card, melee)) {
        case 'slash': return <SlashStrike {...style} />
        case 'claw': return <ClawStrike {...style} />
        case 'crush': return <CrushStrike {...style} />
        case 'spectral': return <SpectralStrike {...style} />
        case 'arrow': return <ArrowVolley {...style} />
        case 'shot': return <GunShot {...style} />
        case 'bolt': return <LightningBolt {...style} />
        case 'breath': return <DragonBreath {...style} />
        case 'barbs': return <BarbVolley {...style} />
        default: return <AttackTrail from={from} to={to} tone={tone} faction={event.faction} durationMs={event.durationMs} melee={melee} />
      }
    }
    case 'spell': {
      if (reducedMotion) return null
      const from: readonly [number, number] | undefined = event.from
        ? [boardX(event.from.x), boardZ(event.from.y)]
        : event.actorId ? NEXUS_POSITION[`${event.actorId}-nexus`] : undefined
      const to: readonly [number, number] | undefined = event.to
        ? [boardX(event.to.x), boardZ(event.to.y)]
        : event.targetId ? NEXUS_POSITION[event.targetId] : undefined
      // El viaje anuncia el lanzamiento; el impacto pertenece al evento de
      // daño ya resuelto, evitando que la víctima estalle antes del proyectil.
      return from && to ? <AttackTrail from={from} to={to} tone={tone} faction={event.faction} durationMs={event.durationMs} melee={false} spell /> : null
    }
    case 'damage':
      return event.to ? (
        <>
        <ImpactBurst cell={[boardX(event.to.x), boardZ(event.to.y)]} tone={tone} timing={timing} power={Math.min(1.6, powerFor(event.amount) + rarityPower(event.cardId))} />
        {!reducedMotion && <ImpactDebris at={[boardX(event.to.x), boardZ(event.to.y)]} cardId={event.targetCardId} durationMs={event.durationMs} />}
        {!reducedMotion && <HitSpill at={[boardX(event.to.x), boardZ(event.to.y)]} cardId={event.targetCardId} durationMs={event.durationMs} amount={event.amount ?? 1} />}
        </>
      ) : null
    case 'shield':
      return event.to ? (
        <ImpactBurst cell={[boardX(event.to.x), boardZ(event.to.y)]} tone="#a8ecff" timing={timing} />
      ) : null
    case 'freeze':
      return event.to ? <FreezeBloom cell={event.to} timing={timing} /> : null
    case 'destroy':
      return event.to ? <>
        <DestroyEmbers cell={event.to} tone={tone} timing={timing} cardId={event.cardId} />
        {!reducedMotion && <ImpactDebris at={[boardX(event.to.x), boardZ(event.to.y)]} cardId={event.cardId} durationMs={event.durationMs} destruction />}
        {!reducedMotion && <DeathFlourish at={[boardX(event.to.x), boardZ(event.to.y)]} cardId={event.cardId} durationMs={event.durationMs} />}
      </> : null
    case 'nexus-damage': {
      const at = event.targetId ? NEXUS_POSITION[event.targetId] : undefined
      return at ? <NexusShock at={at} tone={tone} timing={timing} /> : null
    }
    case 'victory':
      return null
    default:
      return null
  }
}
