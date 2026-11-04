import { useFrame } from '@react-three/fiber'
import { memo, useMemo, useRef } from 'react'
import { AdditiveBlending, QuadraticBezierCurve3, Vector3 } from 'three'
import type { Group, Mesh, MeshBasicMaterial } from 'three'
import type { BoardPiece, PlayerId } from '../game'
import { gridToWorldX, gridToWorldZ } from './grid/gridCoordinates'

/**
 * Flechas de amenaza sobre el tablero. (El mapa rojo de peligro se quitó a
 * petición del propietario: hacía el juego demasiado predecible.)
 *
 * - Flechas: al seleccionar (o señalar) una unidad, arcos dorados hacia lo
 *   que puede atacar y arcos rojos desde quien puede atacarla. Por los arcos
 *   corren pulsos de luz en el sentido del golpe para que se lea quién
 *   amenaza a quién sin pensar.
 */
export interface ThreatFocus {
  readonly pieceId: string
  readonly targets: readonly string[]
  readonly attackers: readonly string[]
  readonly hitsNexus: boolean
}

const OUT = '#ffd76a'
const IN = '#ff4a3a'

function Arc({ from, to, color, reducedMotion }: { from: Vector3; to: Vector3; color: string; reducedMotion: boolean }) {
  const pulses = useRef<Group>(null)
  const tube = useRef<Mesh>(null)
  const curve = useMemo(() => {
    const mid = from.clone().add(to).multiplyScalar(0.5)
    mid.y += 0.6 + from.distanceTo(to) * 0.18
    return new QuadraticBezierCurve3(from, mid, to)
  }, [from, to])
  const head = useMemo(() => {
    const tip = curve.getPoint(1)
    const before = curve.getPoint(0.94)
    const direction = tip.clone().sub(before).normalize()
    return { tip, direction }
  }, [curve])
  const point = useMemo(() => new Vector3(), [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (tube.current) (tube.current.material as MeshBasicMaterial).opacity = reducedMotion ? 0.55 : 0.4 + Math.sin(t * 4) * 0.12
    pulses.current?.children.forEach((child, index) => {
      const k = reducedMotion ? 0.3 + index * 0.3 : (t * 0.8 + index / 3) % 1
      curve.getPoint(k, point)
      child.position.copy(point)
      child.scale.setScalar(0.07 * Math.sin(Math.PI * k) + 0.02)
    })
  })
  return (
    <group>
      <mesh ref={tube}>
        <tubeGeometry args={[curve, 32, 0.025, 6, false]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <group ref={pulses}>
        {[0, 1, 2].map((index) => (
          <mesh key={index}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.9} blending={AdditiveBlending} depthWrite={false} />
          </mesh>
        ))}
      </group>
      {/* Punta de flecha orientada según la tangente final del arco. */}
      <mesh position={head.tip} onUpdate={(mesh) => mesh.lookAt(head.tip.clone().add(head.direction))}>
        <coneGeometry args={[0.09, 0.24, 10]} />
        <meshBasicMaterial color={color} transparent opacity={0.95} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  )
}

const piecePoint = (piece: BoardPiece) => new Vector3(gridToWorldX(piece.position.x), 0.75, gridToWorldZ(piece.position.y))

export const ThreatArrows = memo(function ThreatArrows({ focus, board, nexusZ, reducedMotion }: {
  focus?: ThreatFocus
  board: readonly BoardPiece[]
  nexusZ: (owner: PlayerId) => number
  reducedMotion: boolean
}) {
  const arcs = useMemo(() => {
    if (!focus) return []
    const source = board.find((piece) => piece.instanceId === focus.pieceId)
    if (!source) return []
    const origin = piecePoint(source)
    const byId = new Map(board.map((piece) => [piece.instanceId, piece]))
    const list: { key: string; from: Vector3; to: Vector3; color: string }[] = []
    for (const id of focus.targets) {
      const target = byId.get(id)
      if (target) list.push({ key: `out-${id}`, from: origin, to: piecePoint(target), color: OUT })
    }
    if (focus.hitsNexus) {
      const enemy: PlayerId = source.owner === 'player' ? 'ai' : 'player'
      list.push({ key: 'out-nexus', from: origin, to: new Vector3(gridToWorldX(source.position.x), 0.9, nexusZ(enemy)), color: OUT })
    }
    for (const id of focus.attackers) {
      const attacker = byId.get(id)
      if (attacker) list.push({ key: `in-${id}`, from: piecePoint(attacker), to: origin, color: IN })
    }
    return list
  }, [focus, board, nexusZ])
  return (
    <group>
      {arcs.map((arc) => <Arc key={arc.key} from={arc.from} to={arc.to} color={arc.color} reducedMotion={reducedMotion} />)}
    </group>
  )
})
