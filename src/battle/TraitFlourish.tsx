import { useFrame } from '@react-three/fiber'
import { memo, useMemo, useRef } from 'react'
import { AdditiveBlending, DoubleSide, QuadraticBezierCurve3, Vector3 } from 'three'
import type { Group, Mesh, MeshBasicMaterial } from 'three'
import { glowTexture } from './textures'

/**
 * Habilidades que «hablan»: cuando una palabra clave actúa en un golpe, se ve
 * su efecto sobre el tablero con una animación propia, del color de su
 * identidad (ver keywordIdentity):
 *
 * - Perforar: una lanza atraviesa a la defensora y sigue hasta el Nexo.
 * - Vínculo vital: un corazón vuela desde el golpe hasta el Nexo propio.
 * - Aturdir: estrellas que giran sobre la golpeada.
 * - Guardia: un muro de escudos se levanta delante de la defensora.
 * - Escudo: placas hexagonales que se cierran y estallan al absorber.
 */
export type TraitKind = 'pierce' | 'lifelink' | 'stun' | 'guard' | 'shield'

export interface TraitFx {
  readonly id: string
  readonly kind: TraitKind
  readonly at: readonly [number, number]
  /** Destino del vuelo (Nexo), para Perforar y Vínculo vital. */
  readonly to?: readonly [number, number]
}

const DURATION = 1500
const COLORS: Readonly<Record<TraitKind, string>> = {
  pierce: '#ff9a62', lifelink: '#ff7aa8', stun: '#ffd65a', guard: '#8fb8ff', shield: '#6fd8ff',
}

function useLocalClock() {
  const start = useRef<number | null>(null)
  return () => {
    if (start.current === null) start.current = performance.now()
    return Math.min(1, (performance.now() - start.current) / DURATION)
  }
}

function Flight({ fx, heart }: { fx: TraitFx; heart: boolean }) {
  const clock = useLocalClock()
  const body = useRef<Group>(null)
  const color = COLORS[fx.kind]
  const curve = useMemo(() => {
    const from = new Vector3(fx.at[0], 0.9, fx.at[1])
    const to = new Vector3(fx.to?.[0] ?? fx.at[0], 1.1, fx.to?.[1] ?? fx.at[1])
    const mid = from.clone().add(to).multiplyScalar(0.5)
    mid.y += heart ? 1.6 : 0.6
    return new QuadraticBezierCurve3(from, mid, to)
  }, [fx, heart])
  const point = useMemo(() => new Vector3(), [])
  const tangent = useMemo(() => new Vector3(), [])
  useFrame(() => {
    const t = clock()
    if (!body.current) return
    // La lanza sale disparada; el corazón sube despacio y acelera al final.
    const k = heart ? t * t : Math.min(1, t * 1.6)
    body.current.visible = t < 1
    curve.getPoint(k, point)
    curve.getTangent(k, tangent)
    body.current.position.copy(point)
    body.current.lookAt(point.clone().add(tangent))
    body.current.scale.setScalar(heart ? 0.9 + Math.sin(t * 30) * 0.12 : 1)
  })
  return (
    <group ref={body}>
      {heart ? (
        <sprite scale={[0.5, 0.5, 1]}>
          <spriteMaterial map={glowTexture('ember')} color={color} transparent blending={AdditiveBlending} depthWrite={false} />
        </sprite>
      ) : (
        <>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.9, 6]} />
            <meshBasicMaterial color="#fff1d8" />
          </mesh>
          <mesh position={[0, 0, 0.5]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.06, 0.2, 4]} />
            <meshBasicMaterial color={color} />
          </mesh>
          <sprite scale={[0.6, 0.6, 1]} position={[0, 0, -0.3]}>
            <spriteMaterial map={glowTexture('ember')} color={color} transparent opacity={0.8} blending={AdditiveBlending} depthWrite={false} />
          </sprite>
        </>
      )}
    </group>
  )
}

function StunStars({ fx }: { fx: TraitFx }) {
  const clock = useLocalClock()
  const ring = useRef<Group>(null)
  useFrame(() => {
    const t = clock()
    if (!ring.current) return
    ring.current.visible = t < 1
    ring.current.rotation.y = t * 9
    ring.current.scale.setScalar(t < 0.15 ? t / 0.15 : t > 0.85 ? (1 - t) / 0.15 : 1)
  })
  return (
    <group ref={ring} position={[fx.at[0], 1.55, fx.at[1]]}>
      {[0, 1, 2, 3, 4].map((index) => {
        const angle = (index / 5) * Math.PI * 2
        return (
          <sprite key={index} position={[Math.cos(angle) * 0.38, Math.sin(index * 2) * 0.05, Math.sin(angle) * 0.38]} scale={[0.22, 0.22, 1]}>
            <spriteMaterial map={glowTexture('gold')} color={COLORS.stun} transparent blending={AdditiveBlending} depthWrite={false} />
          </sprite>
        )
      })}
    </group>
  )
}

function GuardWall({ fx }: { fx: TraitFx }) {
  const clock = useLocalClock()
  const wall = useRef<Group>(null)
  useFrame(() => {
    const t = clock()
    wall.current?.children.forEach((child, index) => {
      // Cada escudo sube del suelo un poco después que el anterior.
      const k = Math.max(0, Math.min(1, (t - index * 0.06) / 0.25))
      const fade = t > 0.75 ? (1 - t) / 0.25 : 1
      child.position.y = -0.4 + k * 0.95
      ;((child as Mesh).material as MeshBasicMaterial).opacity = k * fade * 0.75
    })
  })
  return (
    <group ref={wall} position={[fx.at[0], 0.2, fx.at[1]]}>
      {[-0.32, 0, 0.32].map((x, index) => (
        <mesh key={index} position={[x, -0.4, 0.42]}>
          <circleGeometry args={[0.18, 6]} />
          <meshBasicMaterial color={COLORS.guard} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

function ShieldPlates({ fx }: { fx: TraitFx }) {
  const clock = useLocalClock()
  const plates = useRef<Group>(null)
  useFrame(() => {
    const t = clock()
    plates.current?.children.forEach((child, index) => {
      const angle = (index / 6) * Math.PI * 2
      // Se cierran sobre la ficha y, al absorber, salen despedidas.
      const radius = t < 0.35 ? 1.1 - (t / 0.35) * 0.6 : 0.5 + (t - 0.35) * 1.8
      child.position.set(Math.cos(angle) * radius, 0.7 + Math.sin(angle * 2) * 0.1, Math.sin(angle) * radius)
      child.lookAt(0, 0.7, 0)
      ;((child as Mesh).material as MeshBasicMaterial).opacity = t < 0.35 ? t / 0.35 * 0.7 : (1 - t) * 0.9
    })
  })
  return (
    <group ref={plates} position={[fx.at[0], 0, fx.at[1]]}>
      {Array.from({ length: 6 }, (_, index) => (
        <mesh key={index}>
          <circleGeometry args={[0.16, 6]} />
          <meshBasicMaterial color={COLORS.shield} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

export const TraitFlourishes = memo(function TraitFlourishes({ effects, reducedMotion }: { effects: readonly TraitFx[]; reducedMotion: boolean }) {
  if (reducedMotion) return null
  return (
    <group>
      {effects.map((fx) => {
        switch (fx.kind) {
          case 'pierce': return <Flight key={fx.id} fx={fx} heart={false} />
          case 'lifelink': return <Flight key={fx.id} fx={fx} heart />
          case 'stun': return <StunStars key={fx.id} fx={fx} />
          case 'guard': return <GuardWall key={fx.id} fx={fx} />
          case 'shield': return <ShieldPlates key={fx.id} fx={fx} />
        }
      })}
    </group>
  )
})

export const TRAIT_FX_MS = DURATION
