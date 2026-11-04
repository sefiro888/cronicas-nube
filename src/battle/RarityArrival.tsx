import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, BufferGeometry, DoubleSide, Float32BufferAttribute, Line, LineBasicMaterial } from 'three'
import type { Mesh, MeshBasicMaterial, PointLight } from 'three'
import type { Rarity } from '../game'

/**
 * Entrada según la rareza, encima de la caída y el aterrizaje de siempre: la
 * común aterriza sin más, la poco común con un destello, la rara baja dentro
 * de una columna de luz y la mítica llega con un rayo del cielo y una onda.
 * El propietario pidió que la rareza se notara en cualquier acción.
 */
export function RarityArrival({ at, rarity, tone, durationMs, landing }: {
  at: readonly [number, number]
  rarity: Rarity
  tone: string
  durationMs: number
  /** Fracción del evento en que la ficha toca el suelo (ARRIVAL_LANDING). */
  landing: number
}) {
  const start = useRef<number | null>(null)
  const pillar = useRef<Mesh>(null)
  const ring = useRef<Mesh>(null)
  const light = useRef<PointLight>(null)
  const boltRef = useRef<Line>(null)
  const frame = useRef(0)
  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(new Float32Array(13 * 3), 3))
    return g
  }, [])
  const bolt = useMemo(() => new Line(geometry, new LineBasicMaterial({ color: '#fffbe8', transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false })), [geometry])
  useFrame(() => {
    if (start.current === null) start.current = performance.now()
    const t = Math.min(1, (performance.now() - start.current) / Math.max(1, durationMs))
    // Todo se concentra alrededor del aterrizaje.
    const around = Math.max(0, 1 - Math.abs(t - landing) / 0.3)
    const after = Math.max(0, Math.min(1, (t - landing) / (1 - landing)))
    if (pillar.current) {
      const material = pillar.current.material as MeshBasicMaterial
      material.opacity = around * (rarity === 'mythic' ? 0.7 : 0.5)
      pillar.current.scale.set(1 + around * 0.4, 1, 1 + around * 0.4)
    }
    if (ring.current) {
      ring.current.visible = after > 0 && after < 1
      ring.current.scale.setScalar(0.3 + after * (rarity === 'mythic' ? 4 : 2.4))
      ;(ring.current.material as MeshBasicMaterial).opacity = (1 - after) * 0.8
    }
    if (light.current) light.current.intensity = around * (rarity === 'mythic' ? 14 : 6)
    if (rarity === 'mythic' && boltRef.current) {
      const strike = t > landing - 0.12 && t < landing + 0.18
      if (strike && frame.current++ % 2 === 0) {
        const attr = geometry.getAttribute('position') as Float32BufferAttribute
        for (let i = 0; i <= 12; i += 1) {
          const k = i / 12
          const jitter = i === 0 || i === 12 ? 0 : 0.35
          attr.setXYZ(i, at[0] + (Math.random() - 0.5) * jitter, 9 - k * 8.8, at[1] + (Math.random() - 0.5) * jitter)
        }
        attr.needsUpdate = true
      }
      ;(boltRef.current.material as LineBasicMaterial).opacity = strike ? 0.6 + Math.random() * 0.4 : 0
    }
  })
  if (rarity === 'common') return null
  return (
    <group>
      {(rarity === 'rare' || rarity === 'mythic') && (
        <mesh ref={pillar} position={[at[0], 3, at[1]]}>
          <cylinderGeometry args={[0.32, 0.42, 6, 24, 1, true]} />
          <meshBasicMaterial color={rarity === 'mythic' ? '#ffd76a' : tone} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
        </mesh>
      )}
      <mesh ref={ring} position={[at[0], 0.2, at[1]]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.36, 0.5, 48]} />
        <meshBasicMaterial color={rarity === 'mythic' ? '#ffe9a0' : rarity === 'rare' ? '#9fd0ff' : '#b8f0c0'} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
      </mesh>
      {rarity === 'mythic' && <primitive ref={boltRef} object={bolt} />}
      <pointLight ref={light} position={[at[0], 1.2, at[1]]} color={rarity === 'mythic' ? '#ffd76a' : tone} intensity={0} distance={5} decay={2} />
    </group>
  )
}
