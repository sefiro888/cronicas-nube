import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, DoubleSide, NormalBlending } from 'three'
import type { Group, Mesh, MeshBasicMaterial, Sprite } from 'three'
import type { FactionId } from '../game'
import { glowTexture, type GlowTint } from './textures'

/**
 * Firma de cada facción: al invocar, al golpear y al morir sale su motivo
 * propio, encima de los efectos generales. Así una partida de Plaga contra
 * Olimpo no se parece a una de Forja contra Marea aunque las cartas hagan lo
 * mismo: esporas verdes frente a chispas doradas, agua frente a yunque.
 */
type Motion = 'rise' | 'burst' | 'fall' | 'swirl' | 'splash'

interface Motif {
  readonly color: string
  readonly accent: string
  readonly texture: GlowTint
  readonly motion: Motion
  readonly glow: boolean
  /** Anillo de agua o de luz a ras de suelo. */
  readonly ring?: boolean
}

export const FACTION_MOTIF: Readonly<Record<FactionId, Motif>> = {
  fury: { color: '#ff7a2a', accent: '#ffe08a', texture: 'ember', motion: 'rise', glow: true },
  arcane: { color: '#6fb8ff', accent: '#e2f2ff', texture: 'arcane', motion: 'swirl', glow: true, ring: true },
  nature: { color: '#6fbf4a', accent: '#d8f5a0', texture: 'nature', motion: 'swirl', glow: false },
  order: { color: '#ffd76a', accent: '#fff6d8', texture: 'gold', motion: 'rise', glow: true, ring: true },
  shadow: { color: '#8a5ad8', accent: '#d8c2ff', texture: 'shadow', motion: 'swirl', glow: true },
  void: { color: '#5a3aa8', accent: '#b89cff', texture: 'void', motion: 'swirl', glow: true },
  duna: { color: '#e2c084', accent: '#fff0c8', texture: 'gold', motion: 'burst', glow: false },
  fimbul: { color: '#bfe8ff', accent: '#ffffff', texture: 'arcane', motion: 'fall', glow: false },
  samsara: { color: '#ff9ac8', accent: '#ffe0f0', texture: 'gold', motion: 'swirl', glow: false },
  jade: { color: '#5fd6a0', accent: '#d6ffe8', texture: 'nature', motion: 'rise', glow: true },
  olimpo: { color: '#ffd23a', accent: '#ffffff', texture: 'gold', motion: 'burst', glow: true, ring: true },
  sol: { color: '#ffb02a', accent: '#fff2b0', texture: 'gold', motion: 'rise', glow: true, ring: true },
  bestiario: { color: '#c09a6a', accent: '#f2dcb8', texture: 'shadow', motion: 'burst', glow: false },
  plaga: { color: '#8fd04a', accent: '#d8ff9a', texture: 'nature', motion: 'rise', glow: false },
  marea: { color: '#4fb8e0', accent: '#d8f6ff', texture: 'arcane', motion: 'splash', glow: false, ring: true },
  forja: { color: '#ff9a2a', accent: '#fff0c0', texture: 'ember', motion: 'burst', glow: true },
  goblins: { color: '#ff8a1f', accent: '#ffe066', texture: 'ember', motion: 'burst', glow: true },
  tercios: { color: '#c8b8a0', accent: '#fff4dc', texture: 'shadow', motion: 'rise', glow: false },
  kalevala: { color: '#7fd0c8', accent: '#e8fffb', texture: 'arcane', motion: 'fall', glow: false, ring: true },
}

const COUNT: Readonly<Record<'summon' | 'hit' | 'death', number>> = { summon: 14, hit: 9, death: 18 }

export function FactionSignature({ at, faction, mode, durationMs }: {
  at: readonly [number, number]
  faction?: FactionId
  mode: 'summon' | 'hit' | 'death'
  durationMs: number
}) {
  const motif = faction ? FACTION_MOTIF[faction] : undefined
  const group = useRef<Group>(null)
  const ring = useRef<Mesh>(null)
  const start = useRef<number | null>(null)
  const count = COUNT[mode]
  const seeds = useMemo(() => Array.from({ length: count }, (_, i) => ({
    a: i * 2.39996, r: 0.2 + (i % 4) * 0.14, up: 0.5 + (i % 5) * 0.3, size: 0.07 + (i % 3) * 0.04, delay: (i % 5) * 0.05,
  })), [count])
  const life = Math.max(700, durationMs * (mode === 'death' ? 2 : 1.6))
  useFrame(() => {
    if (!motif) return
    if (start.current === null) start.current = performance.now()
    const t = Math.min(1, (performance.now() - start.current) / life)
    group.current?.children.forEach((child, i) => {
      const s = seeds[i]!
      const k = Math.max(0, Math.min(1, (t - s.delay) / (1 - s.delay)))
      child.visible = k > 0 && k < 1
      let x = Math.cos(s.a) * s.r
      let z = Math.sin(s.a) * s.r
      let y = 0.3
      switch (motif.motion) {
        case 'rise': y = 0.2 + k * s.up * 2.2; x *= 1 + k * 0.3; z *= 1 + k * 0.3; break
        case 'burst': x *= 1 + k * 3.2; z *= 1 + k * 3.2; y = 0.4 + s.up * k - 1.4 * k * k; break
        case 'fall': y = 2.4 - k * 2.2 + s.up * 0.2; x += Math.sin(k * 6 + i) * 0.1; break
        case 'swirl': {
          const angle = s.a + k * 5
          x = Math.cos(angle) * s.r * (1 + k); z = Math.sin(angle) * s.r * (1 + k); y = 0.3 + k * s.up * 1.6; break
        }
        case 'splash': x *= 1 + k * 2.4; z *= 1 + k * 2.4; y = Math.max(0.12, 0.3 + s.up * 1.6 * k - 3 * k * k); break
      }
      child.position.set(x, y, z)
      child.scale.setScalar(s.size * (mode === 'death' ? 1.3 : 1) * (motif.motion === 'swirl' ? 1 + k : 1))
      ;(child as Sprite).material.opacity = (1 - k) * 0.95
    })
    if (ring.current) {
      const k = Math.min(1, t * 1.8)
      ring.current.visible = k < 1
      ring.current.scale.setScalar(0.3 + k * (mode === 'death' ? 2.6 : 1.8))
      ;(ring.current.material as MeshBasicMaterial).opacity = (1 - k) * 0.7
    }
  })
  if (!motif) return null
  return (
    <group position={[at[0], 0, at[1]]}>
      <group ref={group}>
        {seeds.map((_, i) => (
          <sprite key={i} visible={false}>
            <spriteMaterial map={glowTexture(motif.texture)} color={i % 3 === 0 ? motif.accent : motif.color} transparent
              blending={motif.glow ? AdditiveBlending : NormalBlending} depthWrite={false} />
          </sprite>
        ))}
      </group>
      {motif.ring && (
        <mesh ref={ring} position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.34, 0.42, 40]} />
          <meshBasicMaterial color={motif.color} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
        </mesh>
      )}
    </group>
  )
}
