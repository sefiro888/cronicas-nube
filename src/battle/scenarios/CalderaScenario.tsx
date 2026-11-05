import { ScenarioAmbientLight, ScenarioHemisphereLight, ScenarioDirectionalLight } from './ScenarioLights'
import { Sparkles } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { BackSide, Color, CylinderGeometry, Matrix4, Quaternion, Vector3 } from 'three'
import type { InstancedMesh, PointLight } from 'three'
import type { AnimationEvent } from '../../game'
import type { GraphicsQuality } from '../../store/preferences'
import { AtmosphericPlumes, type PlumeVent } from '../materials/AtmosphericPlumes'
import { LavaSurface } from '../materials/LavaSurface'
import { stoneMaps } from '../materials/stoneMaterial'
import { forgeIronTexture } from '../textures'
import { DistantVista } from './architecture/DistantVista'
import { greatAnvilGeometry } from './architecture/greatAnvilGeometry'
import { volcanicMesaGeometry } from './architecture/volcanicGeometry'

interface CalderaScenarioProps {
  quality: GraphicsQuality
  reducedMotion: boolean
  event?: AnimationEvent
}

const VENTS: readonly PlumeVent[] = [
  { position: [-7.4, -2.35, -2.2], height: 4.4, spread: 3.4, density: 0.36, color: '#9a9392', seed: 1 },
  { position: [7.8, -2.35, -5.8], height: 5.2, spread: 4.2, density: 0.4, color: '#85898e', seed: 3 },
  { position: [-2.4, -2.35, -12], height: 4.8, spread: 5.6, density: 0.42, color: '#747e89', seed: 7 },
  { position: [4.5, -2.35, 8.2], height: 2.2, spread: 2.7, density: 0.2, color: '#a08c7e', seed: 5 },
]

function BasaltEscarpments({ quality }: { quality: GraphicsQuality }) {
  const columns = useRef<InstancedMesh>(null)
  const maps = stoneMaps('basalt')
  const prism = useMemo(() => {
    const geometry = new CylinderGeometry(0.92, 1, 1, 6, 21)
    const vertices = geometry.getAttribute('position')
    const uv = geometry.getAttribute('uv')
    for (let index = 0; index < vertices.count; index += 1) {
      const x = vertices.getX(index)
      const y = vertices.getY(index)
      const z = vertices.getZ(index)
      const angle = Math.atan2(z, x)
      const tier = Math.round((y + 0.5) * 7)
      const joint = Math.round((y + 0.5) * 21) % 3 === 1 ? 0.052 : 0
      const radius = 1 - joint + Math.sin(tier * 2.8 + angle * 3) * 0.045
      const cut = y > 0.49 ? Math.sin(angle * 2 + 0.8) * 0.055 : 0
      vertices.setXYZ(index, x * radius, y + cut, z * radius)
      uv.setXY(index, uv.getX(index) * 2.1, uv.getY(index) * 5.5)
    }
    geometry.computeVertexNormals()
    return geometry
  }, [])
  useEffect(() => () => prism.dispose(), [prism])
  const formations = useMemo(() => {
    const entries: { position: Vector3; scale: Vector3; angle: number; shade: Color }[] = []
    const rows = quality === 'low' ? 2 : 3
    for (const flank of [-1, 1]) {
      for (let row = 0; row < rows; row += 1) {
        for (let index = 0; index < 11; index += 1) {
          if ((index * 3 + row * 5 + flank) % 7 === 0) continue
          const z = -9.5 + index * 1.12 + (row % 2) * 0.5 + flank * 0.35
          const x = flank * (6.5 + row * 0.83 + Math.sin(index * 1.4) * 0.25)
          const front = Math.max(0, (z + 4) / 8)
          const top = 0.25 + row * 0.4 + Math.sin(index * 1.8 + row + flank) * 0.65 - front * 4.2
          const height = top + 4.1
          entries.push({ position: new Vector3(x, -4.1 + height / 2, z),
            scale: new Vector3(0.59 + Math.sin(index * 2.7) * 0.07, height, 0.59),
            angle: (index % 3) * 0.08 + flank * 0.07, shade: new Color().setScalar(0.64 + (index % 4) * 0.065) })
        }
      }
    }
    return entries
  }, [quality])
  useLayoutEffect(() => {
    if (!columns.current) return
    const matrix = new Matrix4()
    const rotation = new Quaternion()
    formations.forEach((entry, index) => {
      rotation.setFromAxisAngle(new Vector3(0, 1, 0), entry.angle)
      columns.current!.setMatrixAt(index, matrix.compose(entry.position, rotation, entry.scale))
      columns.current!.setColorAt(index, entry.shade)
    })
    columns.current.instanceMatrix.needsUpdate = true
    if (columns.current.instanceColor) columns.current.instanceColor.needsUpdate = true
    columns.current.computeBoundingSphere()
  }, [formations])
  return <instancedMesh ref={columns} args={[undefined, undefined, formations.length]} castShadow={quality !== 'low'} receiveShadow={quality !== 'low'}>
    <primitive object={prism} attach="geometry" />
    <meshStandardMaterial {...maps} color="#626775" bumpScale={0.045} roughness={0.95} metalness={0.015} />
  </instancedMesh>
}

function GreatAnvil({ quality, flare }: { quality: GraphicsQuality; flare: { readonly current: number } }) {
  const geometry = greatAnvilGeometry()
  const iron = forgeIronTexture()
  const maps = stoneMaps('basalt')
  const heat = useRef<PointLight>(null)
  useFrame(() => { if (heat.current) heat.current.intensity = 3.5 + flare.current * 2 })
  return <group position={[-5.4, -0.7, -5.3]} rotation={[0, -0.35, 0]} scale={0.8}>
    <mesh position={[0, -0.4, 0]} receiveShadow={quality !== 'low'}>
      <cylinderGeometry args={[1.65, 1.9, 0.8, 9]} />
      <meshStandardMaterial {...maps} color="#696b76" bumpScale={0.04} roughness={0.95} />
    </mesh>
    <mesh castShadow={quality !== 'low'} receiveShadow={quality !== 'low'} dispose={null}>
      <primitive object={geometry.body} attach="geometry" />
      <meshStandardMaterial bumpMap={iron} bumpScale={0.018} color="#818694" roughness={0.53} metalness={0.55} />
    </mesh>
    {[geometry.face, geometry.horn].map((part, index) => <mesh key={index} castShadow={quality !== 'low'} dispose={null}>
      <primitive object={part} attach="geometry" />
      <meshStandardMaterial bumpMap={iron} bumpScale={0.008} color="#afb0b4" roughness={0.38} metalness={0.65} />
    </mesh>)}
    <group position={[-0.15, 1.72, 0.18]} rotation={[0, 0.24, 0]}>
      <mesh><boxGeometry args={[0.85, 0.11, 0.24]} />
        <meshStandardMaterial color="#ba5025" emissive="#ff4c08" emissiveIntensity={1.5} roughness={0.65} metalness={0.3} />
      </mesh>
      <mesh position={[-0.67, 0.065, 0]} rotation={[0, 0, 0.06]}>
        <boxGeometry args={[0.7, 0.055, 0.07]} /><meshStandardMaterial color="#44414a" metalness={0.7} roughness={0.7} />
      </mesh>
    </group>
    {/* La cadena alta ocultaba el martillo tras la interfaz. Apoyarlo conserva
        su silueta dentro del encuadre normal de juego. */}
    <group position={[-0.7, 1.67, -0.22]} rotation={[0, 0.25, -0.18]}>
      <mesh position={[-0.35, 0.12, 0]}><boxGeometry args={[0.48, 0.3, 0.48]} />
        <meshStandardMaterial bumpMap={iron} bumpScale={0.012} color="#8a8d99" roughness={0.55} metalness={0.55} />
      </mesh>
      <mesh position={[0.2, 0.12, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.047, 0.06, 0.9, 12]} />
        <meshStandardMaterial color="#594337" roughness={0.9} />
      </mesh>
    </group>
    <pointLight ref={heat} position={[0, 2, 0.3]} intensity={3.5} color="#ff7a35" distance={4} />
  </group>
}

/** La masa cercana es geometría; la pintura prolonga las gargantas lejanas.
 * El relleno frío conserva basalto y metal legibles: la emisión queda en la
 * lava y la pieza de la fragua, sin teñir uniformemente todo el escenario. */
export function CalderaScenario({ quality, reducedMotion, event }: CalderaScenarioProps) {
  const flare = useRef(0)
  const basalt = stoneMaps('basalt')
  useFrame((_, delta) => { flare.current = Math.max(0, flare.current - delta * 1.2) })
  useEffect(() => {
    if (!reducedMotion && (event?.type === 'nexus-damage' || event?.type === 'victory' || event?.type === 'destroy')) flare.current = 1
  }, [event, reducedMotion])
  return <>


    <ScenarioAmbientLight intensity={0.3} color="#9ba8c5" />
    <ScenarioHemisphereLight intensity={0.45} color="#a5b6d8" groundColor="#70371e" />
    <ScenarioDirectionalLight position={[-6, 11, 7]} intensity={2.3} color="#ffd8b6" castShadow={quality !== 'low'}
      shadow-mapSize-width={quality === 'high' ? 2048 : 1024} shadow-mapSize-height={quality === 'high' ? 2048 : 1024}
      shadow-camera-left={-13} shadow-camera-right={13} shadow-camera-top={13} shadow-camera-bottom={-13} shadow-bias={-0.0006} />
    <ScenarioDirectionalLight position={[8, 5, -9]} intensity={0.8} color="#9ab6e8" />
    <pointLight position={[0, -1.8, 0]} color="#ff671b" intensity={13} distance={15} decay={2} />
    <DistantVista image={`/assets/scenarios/caldera-vista-v1${quality === 'low' ? '-low' : ''}.webp`} />
    <mesh><sphereGeometry args={[72, 32, 20]} /><meshBasicMaterial color="#20242d" side={BackSide} fog={false} /></mesh>
    <LavaSurface quality={quality} reducedMotion={reducedMotion} flare={flare} />
    <mesh receiveShadow={quality !== 'low'} castShadow={quality !== 'low'} dispose={null}>
      <primitive object={volcanicMesaGeometry()} attach="geometry" />
      <meshStandardMaterial {...basalt} color="#5c616f" bumpScale={0.045} metalness={0.025} roughness={0.96} />
    </mesh>
    <BasaltEscarpments quality={quality} />
    <GreatAnvil quality={quality} flare={flare} />
    <AtmosphericPlumes vents={VENTS} quality={quality} reducedMotion={reducedMotion} />
    {quality !== 'low' && <Sparkles count={quality === 'high' ? 44 : 22} scale={[15, 3.5, 15]} size={1.7}
      speed={reducedMotion ? 0 : 0.45} color="#ffc17a" opacity={0.45} position={[0, -0.7, 0]} />}
  </>
}
