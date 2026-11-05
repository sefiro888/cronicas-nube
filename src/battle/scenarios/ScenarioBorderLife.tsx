import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { BufferAttribute, BufferGeometry, Matrix4 } from 'three'
import type { InstancedMesh } from 'three'
import type { GraphicsQuality } from '../../store/preferences'
import { SCENARIO_ENVIRONMENTS, type SceneId } from '../scenarioEnvironments'
import { SCENARIO_PRESENTATION } from '../scenarioPresentation'

/** Toda la vida ambiental queda fuera de la cuadrícula y de sus Nexos. Los
 * fragmentos son instancias pequeñas, no más geometría alta frente a la cámara. */
export function ScenarioBorderLife({ scenario, quality, reducedMotion }: { scenario: SceneId; quality: GraphicsQuality; reducedMotion: boolean }) {
  const family = SCENARIO_ENVIRONMENTS[scenario].family
  const accent = SCENARIO_PRESENTATION[scenario].accent
  const stones = useRef<InstancedMesh>(null)
  const invalidate = useThree((state) => state.invalidate)
  const count = quality === 'low' ? 10 : 20
  const crystal = family === 'motes' || family === 'snow'
  useEffect(() => {
    const mesh = stones.current
    if (!mesh) return
    const matrix = new Matrix4()
    for (let index = 0; index < count; index += 1) {
      const side = index % 2 ? 1 : -1
      const z = -3.2 + Math.floor(index / 2) * (6.4 / Math.max(1, count / 2 - 1))
      const scale = .065 + (index * 7 % 5) * .013
      matrix.makeScale(scale * (crystal ? .8 : 1.4), scale * (crystal ? 2 : .7), scale)
      matrix.setPosition(side * (4.42 + .04 * Math.sin(index * 2.3)), -.18, z)
      mesh.setMatrixAt(index, matrix)
    }
    mesh.instanceMatrix.needsUpdate = true
    mesh.computeBoundingSphere()
    invalidate()
  }, [count, crystal, invalidate])
  const motes = useMemo(() => {
    const length = quality === 'high' ? 42 : quality === 'medium' ? 22 : 0
    const positions = new Float32Array(length * 3)
    for (let index = 0; index < length; index += 1) {
      const side = index % 2 ? 1 : -1
      positions[index * 3] = side * (5.8 + (index * .37 % 1.7))
      positions[index * 3 + 1] = .2 + index * .23 % 1.9
      positions[index * 3 + 2] = -7 + index * .73 % 12
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    return geometry
  }, [quality])
  useEffect(() => () => motes.dispose(), [motes])
  useFrame(({ clock }) => {
    if (reducedMotion || quality === 'low') return
    const position = motes.getAttribute('position')
    const time = clock.elapsedTime
    for (let index = 0; index < position.count; index += 1) {
      const base = .2 + index * .23 % 1.9
      const drift = family === 'snow' || family === 'dust' ? -.16 : .12
      position.setY(index, .1 + ((base + time * drift + Math.sin(index * 1.7) * .12) % 2 + 2) % 2)
    }
    position.needsUpdate = true
  })
  return <group name={`scenario-border-${scenario}`}>
    <instancedMesh ref={stones} args={[undefined, undefined, count]} castShadow={quality !== 'low'} receiveShadow raycast={() => null}>
      {crystal ? <octahedronGeometry args={[1, 0]} /> : <dodecahedronGeometry args={[1, 0]} />}
      <meshStandardMaterial color={family === 'leaves' ? '#4e6542' : family === 'embers' ? '#695445' : '#677279'} roughness={.87} metalness={.08} emissive={accent} emissiveIntensity={crystal ? .08 : .025} />
    </instancedMesh>
    {quality !== 'low' && <points geometry={motes} raycast={() => null}>
      <pointsMaterial color={family === 'snow' || family === 'spray' ? '#b9d9de' : accent} size={family === 'leaves' ? .05 : .034} transparent opacity={family === 'embers' ? .44 : .3} depthWrite={false} sizeAttenuation />
    </points>}
  </group>
}
