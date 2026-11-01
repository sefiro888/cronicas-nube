import { useFrame } from '@react-three/fiber'
import { memo, useRef } from 'react'
import { AdditiveBlending, DoubleSide } from 'three'
import type { Group, Mesh, MeshBasicMaterial } from 'three'
import { FACTION_BY_ID, type FactionId, type PlayerId } from '../game'
import { BOARD_WORLD_HALF, nexusWorldZ } from './grid/gridCoordinates'

/**
 * Marco del tablero según las facciones que se enfrentan: cada mitad lleva
 * en sus bordes el color de la facción que la defiende, con un estandarte en
 * cada esquina, y en la costura del centro las dos energías se encuentran y
 * chisporrotean. Así el tablero dice quién juega contra quién sin mirar los
 * retratos.
 */
const EDGE = 0.07
const HALF = BOARD_WORLD_HALF + 0.12

function Half({ faction, sign, reducedMotion }: { faction: FactionId; sign: number; reducedMotion: boolean }) {
  const color = FACTION_BY_ID[faction].accentColor
  const glow = useRef<Group>(null)
  const banners = useRef<Group>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    glow.current?.children.forEach((child) => {
      ;((child as Mesh).material as MeshBasicMaterial).opacity = reducedMotion ? 0.6 : 0.5 + Math.sin(t * 1.4) * 0.15
    })
    banners.current?.children.forEach((pole, index) => {
      const cloth = pole.children[1]
      if (cloth) cloth.rotation.y = reducedMotion ? 0 : Math.sin(t * 1.8 + index * 1.3) * 0.25
    })
  })
  const depth = HALF
  return (
    <group>
      <group ref={glow}>
        {/* Bordes laterales de esta mitad y el borde del fondo. */}
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * HALF, 0.1, sign * depth / 2]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[EDGE, depth]} />
            <meshBasicMaterial color={color} transparent opacity={0.55} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
          </mesh>
        ))}
        <mesh position={[0, 0.1, sign * depth]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[HALF * 2, EDGE]} />
          <meshBasicMaterial color={color} transparent opacity={0.55} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
        </mesh>
      </group>
      {/* Estandartes en las esquinas del fondo: asta y paño del color de la facción. */}
      <group ref={banners}>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * (HALF + 0.18), 0, sign * (depth - 0.1)]}>
            <mesh position={[0, 0.85, 0]}>
              <cylinderGeometry args={[0.025, 0.035, 1.7, 8]} />
              <meshStandardMaterial color="#3a2c1c" roughness={0.6} metalness={0.4} />
            </mesh>
            <group position={[0, 1.45, 0]}>
              <mesh position={[side * -0.2, -0.25, 0]}>
                <planeGeometry args={[0.38, 0.62]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} roughness={0.8} side={DoubleSide} />
              </mesh>
            </group>
          </group>
        ))}
      </group>
    </group>
  )
}

/** Costura central: cada lado del color de su facción y chispas donde se tocan. */
function Seam({ playerColor, aiColor, playerSign, reducedMotion }: { playerColor: string; aiColor: string; playerSign: number; reducedMotion: boolean }) {
  const sparks = useRef<Group>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    sparks.current?.children.forEach((child, index) => {
      const k = (t * 0.25 + index / 8) % 1
      child.position.x = -HALF + k * HALF * 2
      child.position.y = 0.16 + Math.abs(Math.sin(t * 9 + index)) * 0.08
      ;((child as Mesh).material as MeshBasicMaterial).opacity = reducedMotion ? 0 : 0.5 + Math.sin(t * 20 + index * 3) * 0.4
    })
  })
  return (
    <group>
      <mesh position={[0, 0.098, playerSign * 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[HALF * 2, 0.08]} />
        <meshBasicMaterial color={playerColor} transparent opacity={0.6} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh position={[0, 0.098, -playerSign * 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[HALF * 2, 0.08]} />
        <meshBasicMaterial color={aiColor} transparent opacity={0.6} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <group ref={sparks}>
        {Array.from({ length: 8 }, (_, index) => (
          <mesh key={index}>
            <sphereGeometry args={[0.03, 6, 6]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

export const FactionFrame = memo(function FactionFrame({ factions, reducedMotion }: {
  factions: Readonly<Record<PlayerId, FactionId | undefined>>
  reducedMotion: boolean
}) {
  const playerSign = Math.sign(nexusWorldZ('player')) || 1
  const player = factions.player
  const ai = factions.ai
  if (!player || !ai) return null
  return (
    <group>
      <Half faction={player} sign={playerSign} reducedMotion={reducedMotion} />
      <Half faction={ai} sign={-playerSign} reducedMotion={reducedMotion} />
      <Seam playerColor={FACTION_BY_ID[player].accentColor} aiColor={FACTION_BY_ID[ai].accentColor} playerSign={playerSign} reducedMotion={reducedMotion} />
    </group>
  )
})
