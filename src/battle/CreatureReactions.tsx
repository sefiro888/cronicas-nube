import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, NormalBlending } from 'three'
import type { Group, PointLight, Sprite } from 'three'
import { creatureKind, SPILL_COLORS, type CreatureKind } from './creatureFx'
import { glowTexture } from './textures'

/**
 * Cómo reacciona cada criatura al golpe y a la muerte (ver creatureFx.ts).
 * Todo son sprites y mallas mínimas con el reloj propio del evento.
 */
const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

function useClock(durationMs: number) {
  const start = useRef<number | null>(null)
  return () => {
    if (start.current === null) start.current = performance.now()
    return clamp01((performance.now() - start.current) / Math.max(1, durationMs))
  }
}

/** Textura y mezcla según lo que salta: la niebla y las gotas no brillan. */
const LOOK: Readonly<Record<CreatureKind, { readonly texture: Parameters<typeof glowTexture>[0]; readonly glow: boolean; readonly gravity: number }>> = {
  flesh: { texture: 'shadow', glow: false, gravity: 2.4 },
  plant: { texture: 'nature', glow: false, gravity: 0.6 },
  machine: { texture: 'ember', glow: true, gravity: 2.8 },
  spirit: { texture: 'arcane', glow: true, gravity: -0.6 },
  stone: { texture: 'shadow', glow: false, gravity: 2.6 },
  crystal: { texture: 'arcane', glow: true, gravity: 2 },
  goblin: { texture: 'ember', glow: true, gravity: 1.6 },
}

/** Lo que salta del golpe: gotas, hojas, chispas, niebla o esquirlas. */
export function HitSpill({ at, cardId, durationMs, amount }: {
  at: readonly [number, number]; cardId?: string; durationMs: number; amount: number
}) {
  const kind = creatureKind(cardId)
  const look = LOOK[kind]
  const [main, light] = SPILL_COLORS[kind]
  const clock = useClock(Math.max(500, durationMs * 1.6))
  const group = useRef<Group>(null)
  const count = Math.min(22, 7 + amount * 3)
  const seeds = useMemo(() => Array.from({ length: count }, (_, i) => {
    const a = i * 2.39996
    return { x: Math.cos(a), z: Math.sin(a), up: 0.6 + (i % 4) * 0.35, reach: 0.35 + (i % 5) * 0.12, size: 0.05 + (i % 3) * 0.035, spin: i % 2 ? 1 : -1 }
  }), [count])
  useFrame(() => {
    const t = clock()
    group.current?.children.forEach((child, i) => {
      const s = seeds[i]!
      child.visible = t < 1
      // Las hojas planean en espiral; el resto sale disparado y cae.
      const flutter = kind === 'plant' ? Math.sin(t * 9 * s.spin + i) * 0.12 : 0
      child.position.set(s.x * s.reach * t + flutter, 0.7 + s.up * t - look.gravity * t * t * 0.5, s.z * s.reach * t)
      child.scale.setScalar(s.size * (kind === 'spirit' ? 1 + t * 3 : 1 - t * 0.4))
      ;(child as Sprite).material.opacity = (1 - t) * (kind === 'spirit' ? 0.6 : 0.95)
      ;(child as Sprite).material.rotation = t * 6 * s.spin
    })
  })
  return (
    <group ref={group} position={[at[0], 0, at[1]]}>
      {seeds.map((_, i) => (
        <sprite key={i}>
          <spriteMaterial map={glowTexture(look.texture)} color={i % 3 === 0 ? light : main} transparent
            blending={look.glow ? AdditiveBlending : NormalBlending} depthWrite={false} />
        </sprite>
      ))}
    </group>
  )
}

/**
 * Remate propio de cada criatura al morir, encima de las pavesas de siempre:
 * el constructo se desmonta en tuercas que saltan, el espíritu sube en
 * columna y se deshace, la planta estalla en hojas, la carne se desploma en
 * una nube de polvo y el goblin revienta en una bola de fuego con humo.
 */
export function DeathFlourish({ at, cardId, durationMs }: { at: readonly [number, number]; cardId?: string; durationMs: number }) {
  const kind = creatureKind(cardId)
  const clock = useClock(Math.max(900, durationMs * 1.8))
  const group = useRef<Group>(null)
  const light = useRef<PointLight>(null)
  const [main, accent] = SPILL_COLORS[kind]
  const count = kind === 'goblin' ? 26 : kind === 'spirit' ? 14 : 18
  const seeds = useMemo(() => Array.from({ length: count }, (_, i) => {
    const a = i * 2.39996
    return { x: Math.cos(a), z: Math.sin(a), up: 0.8 + (i % 5) * 0.4, size: 0.12 + (i % 4) * 0.06, delay: (i % 6) * 0.04 }
  }), [count])
  useFrame(() => {
    const t = clock()
    group.current?.children.forEach((child, i) => {
      const s = seeds[i]!
      const k = clamp01((t - s.delay) / (1 - s.delay))
      child.visible = k > 0 && k < 1
      const sprite = child as Sprite
      switch (kind) {
        case 'spirit':
          // Columna que asciende girando y se deshace arriba.
          child.position.set(Math.cos(k * 8 + i) * 0.25 * (1 - k), 0.4 + k * 2.6, Math.sin(k * 8 + i) * 0.25 * (1 - k))
          child.scale.setScalar(s.size * (1 + k * 2))
          sprite.material.opacity = (1 - k) * 0.7
          break
        case 'goblin':
          // Bola de fuego que se expande y deja humo subiendo.
          child.position.set(s.x * k * 0.9, 0.5 + s.up * k * 0.6, s.z * k * 0.9)
          child.scale.setScalar(s.size * (1.4 + k * 3.2))
          sprite.material.opacity = (1 - k) * 0.85
          break
        case 'machine':
          // Tuercas y chispas que saltan y rebotan.
          child.position.set(s.x * k * 1.2, Math.max(0.08, 0.5 + s.up * k - 2.8 * k * k), s.z * k * 1.2)
          child.scale.setScalar(s.size * 0.6)
          sprite.material.opacity = 1 - k * 0.8
          break
        case 'plant':
          child.position.set(s.x * k * 1.1 + Math.sin(k * 10 + i) * 0.1, 0.4 + s.up * k * 0.9 - k * k * 0.5, s.z * k * 1.1)
          child.scale.setScalar(s.size * 0.8)
          sprite.material.opacity = 1 - k
          sprite.material.rotation = k * 8
          break
        default:
          // Desplome: nube de polvo baja que se abre a ras de suelo.
          child.position.set(s.x * (0.2 + k * 0.9), 0.15 + k * 0.35, s.z * (0.2 + k * 0.9))
          child.scale.setScalar(s.size * (1.2 + k * 2.5))
          sprite.material.opacity = (1 - k) * 0.55
      }
    })
    if (light.current) light.current.intensity = kind === 'goblin' || kind === 'machine' ? Math.pow(1 - t, 3) * 9 : 0
  })
  const glow = kind === 'goblin' || kind === 'machine' || kind === 'spirit' || kind === 'crystal'
  const texture = kind === 'goblin' || kind === 'machine' ? 'ember' : kind === 'spirit' || kind === 'crystal' ? 'arcane' : kind === 'plant' ? 'nature' : 'shadow'
  const dust = kind === 'flesh' || kind === 'stone' ? '#8a7a66' : undefined
  return (
    <group position={[at[0], 0, at[1]]}>
      <group ref={group}>
        {seeds.map((_, i) => (
          <sprite key={i} visible={false}>
            <spriteMaterial map={glowTexture(texture)} color={dust ?? (i % 3 === 0 ? accent : main)} transparent
              blending={glow ? AdditiveBlending : NormalBlending} depthWrite={false} />
          </sprite>
        ))}
      </group>
      <pointLight ref={light} position={[0, 0.7, 0]} color={kind === 'goblin' ? '#ff7a1f' : '#ffd27a'} intensity={0} distance={4} decay={2} />
    </group>
  )
}
