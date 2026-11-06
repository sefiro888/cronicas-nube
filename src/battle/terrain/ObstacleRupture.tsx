import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { Mesh, type Euler, type Group, type MeshBasicMaterial, type PointLight, type Sprite, type Vector3 } from 'three'
import type { AnimationEvent, Position } from '../../game'
import { gridToWorldX, gridToWorldZ } from '../grid/gridCoordinates'
import { glowTexture, type BoardTileStyle } from '../textures'
import { TERRAIN_LOOK, TerrainMarks } from './TerrainMarks'

const accents: Record<BoardTileStyle, string> = {
  stone: '#ffdfac', basalt: '#ff7229', moss: '#c8ed9d', sand: '#ffb25e',
  ice: '#83dfff', sandstone: '#ffd36e', glaze: '#7af4c4', forge: '#ffc76d',
  tide: '#7de8ff', forest: '#c9ef92',
}

type Fragment = { mesh: Mesh; at: Vector3; angle: Euler }

export function ObstacleRupture({ event, position, terrainStyle, reducedMotion }: {
  event: AnimationEvent
  position: Position
  terrainStyle: BoardTileStyle
  reducedMotion: boolean
}) {
  const body = useRef<Group>(null)
  const shards = useRef<Group>(null)
  const dust = useRef<Group>(null)
  const ring = useRef<Mesh>(null)
  const light = useRef<PointLight>(null)
  const started = useRef<number | undefined>(undefined)
  const fragments = useRef<Fragment[]>([])
  const color = accents[terrainStyle]
  const x = position.x - (event.from?.x ?? position.x)
  const z = position.y - (event.from?.y ?? position.y)
  useFrame(({ clock }) => {
    started.current ??= clock.elapsedTime
    const t = reducedMotion ? .32 : Math.min(1, (clock.elapsedTime - started.current) * 1000 / event.durationMs)
    const burst = Math.max(0, (t - .17) / .83)
    if (body.current) {
      if (!fragments.current.length) {
        body.current.traverse((object) => {
          if (object instanceof Mesh) fragments.current.push({ mesh: object, at: object.position.clone(), angle: object.rotation.clone() })
        })
      }
      body.current.rotation.z = Math.sin(t * 44) * Math.max(0, .17 - t) * .45
      body.current.visible = !reducedMotion && t < .94
      for (const [index, fragment] of fragments.current.entries()) {
        const angle = index * 2.39996
        const reach = burst * (.42 + (index % 4) * .13)
        fragment.mesh.position.set(
          fragment.at.x + (Math.cos(angle) + x * .6) * reach,
          fragment.at.y * (1 - burst) + Math.sin(burst * Math.PI) * (.23 + (index % 3) * .19),
          fragment.at.z + (Math.sin(angle) + z * .6) * reach,
        )
        fragment.mesh.rotation.set(fragment.angle.x + burst * (index % 3 + 1) * 2, fragment.angle.y + burst * 3, fragment.angle.z + burst * 2)
        fragment.mesh.scale.setScalar(Math.min(1, (1 - burst) * 3))
      }
    }
    if (ring.current) {
      ring.current.scale.setScalar(.35 + burst * 1.35)
      ;(ring.current.material as MeshBasicMaterial).opacity = t < .17 ? 0 : (1 - burst) ** 2 * .9
    }
    if (light.current) light.current.intensity = t < .17 ? 0 : (1 - burst) ** 5 * 9
    dust.current?.children.forEach((object, index) => {
      const cloud = object as Sprite
      const angle = index * 2.39996
      const radius = (.12 + burst * .76) * (1 + (index % 4) * .11)
      cloud.position.set(Math.cos(angle) * radius, .14 + burst * (.12 + (index % 3) * .09), Math.sin(angle) * radius)
      cloud.scale.setScalar(.22 + burst * .72)
      cloud.material.opacity = t < .17 ? 0 : Math.sin(Math.PI * burst) * .38
    })
    shards.current?.children.forEach((child, index) => {
      const angle = index * 2.39996
      const radius = burst * (.55 + (index % 7) * .13)
      child.visible = !reducedMotion && t >= .17 && burst < .96
      child.position.set((Math.cos(angle) + x * .55) * radius, .1 + Math.sin(burst * Math.PI) * (.22 + (index % 5) * .21), (Math.sin(angle) + z * .55) * radius)
      child.rotation.set(angle + burst * 5, burst * 3, angle)
      child.scale.setScalar(Math.min(1, (1 - burst) * 2.5))
    })
  })
  return <group name="derrumbe-obstaculo" position={[gridToWorldX(position.x), 0, gridToWorldZ(position.y)]}>
    <group ref={body}><TerrainMarks rubble cover={false} position={position} terrainStyle={terrainStyle} /></group>
    <group ref={shards}>
      {Array.from({ length: 23 }, (_, index) => (
        <mesh key={index} visible={false} raycast={() => null}>
          <tetrahedronGeometry args={[index < 9 ? .055 : .026]} />
          {index < 9
            ? <meshStandardMaterial color={TERRAIN_LOOK[terrainStyle].rubble} roughness={.75} flatShading />
            : <meshBasicMaterial color={color} toneMapped={false} />}
        </mesh>
      ))}
    </group>
    {!reducedMotion && <group ref={dust}>
      {Array.from({ length: 9 }, (_, index) => (
        <sprite key={index} raycast={() => null}>
          <spriteMaterial alphaMap={glowTexture('gold')} color={terrainStyle === 'ice' || terrainStyle === 'tide' ? '#bddff1' : TERRAIN_LOOK[terrainStyle].coverTop}
            transparent opacity={0} depthWrite={false} />
        </sprite>
      ))}
    </group>}
    <mesh ref={ring} position={[0, .115, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
      <ringGeometry args={[.43, .48, 8]} />
      <meshBasicMaterial color={color} opacity={0} transparent depthWrite={false} toneMapped={false} />
    </mesh>
    {!reducedMotion && <pointLight ref={light} color={color} position={[0, .43, 0]} intensity={0} distance={2.3} />}
  </group>
}
