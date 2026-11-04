import { useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, RepeatWrapping, SRGBColorSpace } from 'three'
import type { MeshBasicMaterial, PointLight } from 'three'
import { withBase } from '../utils/assets'
import { BOARD_WORLD_HALF } from './grid/gridCoordinates'

/**
 * Río de lava que parte el tablero de la Caldera por la costura central: la
 * Caldera divide el campo de batalla en dos. Sale de la imagen que creó el
 * propietario (el río, girado para dejarlo horizontal). La lava fluye
 * despacio y su resplandor late; va por encima de la costura y bajo las
 * fichas, sin tapar casillas jugables más allá de su borde.
 */
const WIDTH = 0.36

export function LavaRiver({ reducedMotion }: { reducedMotion: boolean }) {
  const source = useTexture(withBase('/assets/terrain/lava-caldera-rio-v1.webp'))
  const texture = useMemo(() => {
    const map = source.clone()
    map.colorSpace = SRGBColorSpace
    map.wrapS = RepeatWrapping
    // Tres tramos del río a lo largo del tablero: con uno solo se estiraba y
    // las burbujas parecían manchas alargadas.
    map.repeat.set(3, 1)
    map.needsUpdate = true
    return map
  }, [source])
  const river = useRef<MeshBasicMaterial>(null)
  const glow = useRef<MeshBasicMaterial>(null)
  const light = useRef<PointLight>(null)
  useFrame(({ clock }, delta) => {
    if (reducedMotion) return
    // Se mueve a través del material (ref) y no de la textura memoizada.
    const map = river.current?.map
    if (map) map.offset.x = (map.offset.x + delta * 0.012) % 1
    const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 1.3)
    if (glow.current) glow.current.opacity = 0.18 + pulse * 0.12
    if (light.current) light.current.intensity = 1.6 + pulse * 0.8
  })
  const length = BOARD_WORLD_HALF * 2 + 0.3
  return (
    <group position={[0, 0.172, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <planeGeometry args={[length, WIDTH]} />
        <meshBasicMaterial ref={river} map={texture} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      {/* Resplandor que se derrama un poco sobre las losas vecinas. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} renderOrder={1}>
        <planeGeometry args={[length, WIDTH * 2.6]} />
        <meshBasicMaterial ref={glow} color="#ff6a1a" transparent opacity={0.22} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <pointLight ref={light} position={[0, 0.5, 0]} color="#ff7a2a" intensity={2} distance={4.5} decay={2} />
    </group>
  )
}
