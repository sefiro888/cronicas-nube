import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, Color, DoubleSide } from 'three'
import type { Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PointLight, Sprite } from 'three'
import { glowTexture } from './textures'

/**
 * Corona del Nexo: un gran cristal que flota sobre el pedestal, con cristales
 * satélite, una columna de luz y una cúpula de escudo del color del bando.
 *
 * Existe porque el Nexo era un pedestal bajo con una corona de esquirlas y el
 * propietario lo encontraba «nada imponente», justo lo que hay que proteger
 * y destruir. Todo lo que hace la corona sale de la Vida ya resuelta:
 *
 * - Desgaste: el cristal se inclina y se apaga, los satélites caen uno a uno
 *   y, pasada la mitad, sale humo y se desprenden esquirlas.
 * - Peligro (un cuarto de Vida o menos): late en rojo y parpadea.
 * - Golpe: la cúpula se ilumina como si encajara el impacto.
 * - Caída: el cristal se hincha, implosiona y deja una columna de luz.
 */
interface NexusCrownProps {
  readonly color: string
  /** 0 = intacto, 1 = sin Vida. */
  readonly damage: number
  /** Momento del último golpe (performance.now), para iluminar la cúpula. */
  readonly hitAt: { readonly current: number }
  readonly collapsing: boolean
  readonly reducedMotion: boolean
}

/** Por debajo de esta fracción de Vida, el Nexo entra en fase de peligro. */
export const NEXUS_DANGER_RATIO = 0.25

const DANGER = new Color('#ff2a1a')
const SATELLITES = 4

export function NexusCrown({ color, damage, hitAt, collapsing, reducedMotion }: NexusCrownProps) {
  const crystal = useRef<Mesh>(null)
  const satellites = useRef<Group>(null)
  const dome = useRef<Mesh>(null)
  const column = useRef<Mesh>(null)
  const light = useRef<PointLight>(null)
  const smoke = useRef<Group>(null)
  const falling = useRef<Group>(null)
  const collapseAt = useRef<number | null>(null)
  const base = useMemo(() => new Color(color), [color])
  const tint = useMemo(() => new Color(), [])
  const danger = damage >= 1 - NEXUS_DANGER_RATIO
  // Satélites que quedan: uno menos por cada cuarto de Vida perdido.
  const alive = Math.max(0, SATELLITES - Math.floor(damage * SATELLITES))
  const smokeCount = damage > 0.45 ? Math.round(4 + damage * 8) : 0
  const smokeSeeds = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ x: Math.sin(i * 2.3) * 0.35, z: Math.cos(i * 1.7) * 0.35, delay: i / 12 })), [])

  useFrame(() => {
    const now = performance.now()
    const t = now / 1000
    const sinceHit = now - hitAt.current
    const hit = !reducedMotion && sinceHit < 900 ? 1 - sinceHit / 900 : 0
    if (collapsing && collapseAt.current === null) collapseAt.current = now
    if (!collapsing) collapseAt.current = null
    const fall = collapseAt.current === null ? 0 : Math.min(1, (now - collapseAt.current) / 1600)
    // Peligro: latido rojo rápido; si no, respiración lenta del color propio.
    const pulse = danger ? 0.5 + 0.5 * Math.sin(t * 9) : 0.5 + 0.5 * Math.sin(t * 1.6)
    tint.copy(base).lerp(DANGER, danger ? 0.55 + pulse * 0.3 : damage * 0.25)

    if (crystal.current) {
      const material = crystal.current.material as MeshStandardMaterial
      material.color.copy(tint)
      material.emissive.copy(tint)
      material.emissiveIntensity = (0.5 + (1 - damage) * 0.9 + hit * 2.5) * (danger && Math.sin(t * 23) > 0.7 ? 0.35 : 1)
      const bob = reducedMotion ? 0 : Math.sin(t * 1.3) * 0.06
      // Implosión: se hincha un instante y desaparece hacia dentro.
      const swell = fall < 0.25 ? 1 + fall * 1.6 : Math.max(0, 1.4 * (1 - (fall - 0.25) / 0.35))
      crystal.current.scale.set(0.3 * swell, 0.62 * swell, 0.3 * swell)
      crystal.current.position.y = 1.42 + bob - damage * 0.12
      crystal.current.rotation.y = reducedMotion ? 0.4 : t * 0.45
      crystal.current.rotation.z = damage * 0.22 + (hit ? Math.sin(sinceHit * 0.08) * 0.08 * hit : 0)
      crystal.current.visible = swell > 0.001
    }
    satellites.current?.children.forEach((child, i) => {
      const gone = i >= alive || fall > 0.2
      const angle = (reducedMotion ? 0 : t * 0.8) + (i / SATELLITES) * Math.PI * 2
      child.visible = !gone
      child.position.set(Math.cos(angle) * 0.62, 1.32 + Math.sin(t * 2 + i) * 0.08, Math.sin(angle) * 0.62)
      child.rotation.y = t * 1.5
      ;((child as Mesh).material as MeshStandardMaterial).emissive.copy(tint)
    })
    if (dome.current) {
      const material = dome.current.material as MeshBasicMaterial
      material.color.copy(tint)
      // Casi invisible en reposo; se enciende con el golpe como un escudo.
      material.opacity = fall > 0 ? 0 : 0.045 + pulse * 0.02 + hit * 0.42
      dome.current.scale.setScalar(1 + hit * 0.06)
    }
    if (column.current) {
      const material = column.current.material as MeshBasicMaterial
      material.color.copy(tint)
      const burst = fall > 0.3 ? Math.sin(Math.PI * Math.min(1, (fall - 0.3) / 0.7)) : 0
      // En reposo, casi invisible: la columna del Nexo propio, el más cercano a la
      // cámara, cruzaba el centro del tablero como una franja.
      material.opacity = fall > 0 ? burst * 0.85 : 0.025 + (1 - damage) * 0.03 + hit * 0.22
      column.current.scale.set(1 + burst * 2.2, 1 + burst * 0.6, 1 + burst * 2.2)
    }
    if (light.current) {
      light.current.color.copy(tint)
      light.current.intensity = fall > 0 ? Math.sin(Math.PI * fall) * 14 : 1.2 + (1 - damage) * 1.2 + hit * 5 + (danger ? pulse * 2.5 : 0)
    }
    smoke.current?.children.forEach((child, i) => {
      const seed = smokeSeeds[i]!
      const k = ((t * 0.35 + seed.delay) % 1)
      child.visible = i < smokeCount && !reducedMotion
      child.position.set(seed.x + Math.sin(t + i) * 0.08 * k, 0.9 + k * 1.6, seed.z)
      child.scale.setScalar(0.35 + k * 0.7)
      ;(child as Sprite).material.opacity = (1 - k) * 0.35 * Math.min(1, (damage - 0.45) * 3)
    })
    falling.current?.children.forEach((child, i) => {
      const k = ((t * 0.5 + i * 0.37) % 1)
      child.visible = damage > 0.6 && !reducedMotion && fall === 0
      child.position.set(Math.sin(i * 4.1) * 0.3, 1.3 - k * 1.1, Math.cos(i * 2.9) * 0.3)
      child.rotation.set(k * 6, k * 4, 0)
    })
  })

  return (
    <group>
      <mesh ref={crystal} position={[0, 1.42, 0]} castShadow>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.2} roughness={0.12} metalness={0.1} transparent opacity={0.92} />
      </mesh>
      <group ref={satellites}>
        {Array.from({ length: SATELLITES }, (_, i) => (
          <mesh key={i} scale={[0.07, 0.16, 0.07]}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={1.4} roughness={0.2} />
          </mesh>
        ))}
      </group>
      {/* Columna de luz que sube del pedestal; en la caída estalla hacia el cielo. */}
      <mesh ref={column} position={[0, 2.6, 0]}>
        <cylinderGeometry args={[0.16, 0.34, 4.2, 20, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
      </mesh>
      {/* Cúpula de escudo del comandante. Malla de facetas para que se lea como energía, no como cristal. */}
      <mesh ref={dome} position={[0, 0.1, 0]}>
        <icosahedronGeometry args={[1.35, 2]} />
        <meshBasicMaterial color={color} transparent opacity={0.05} wireframe blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <group ref={smoke}>
        {smokeSeeds.map((_, i) => (
          <sprite key={i} visible={false}>
            <spriteMaterial map={glowTexture('shadow')} color="#3a332c" transparent depthWrite={false} />
          </sprite>
        ))}
      </group>
      <group ref={falling}>
        {Array.from({ length: 5 }, (_, i) => (
          <mesh key={i} visible={false} scale={0.045}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
          </mesh>
        ))}
      </group>
      <pointLight ref={light} position={[0, 1.5, 0]} color={color} intensity={2} distance={4.5} decay={2} />
    </group>
  )
}
