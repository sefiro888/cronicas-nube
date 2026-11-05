import { ScenarioAmbientLight, ScenarioHemisphereLight, ScenarioDirectionalLight } from './ScenarioLights'
import { Sparkles } from '@react-three/drei'
import { useMemo } from 'react'
import { ExtrudeGeometry, Shape } from 'three'
import type { AnimationEvent } from '../../game'
import type { GraphicsQuality } from '../../store/preferences'
import { stoneMaps } from '../materials/stoneMaterial'
import { DistantVista } from './architecture/DistantVista'
import { DesertGround, desertGroundHeight } from './architecture/DesertGround'
import { DunaRelief } from './architecture/DunaRelief'
import { bundledShaftGeometry, cavettoGeometry, papyrusCapitalGeometry, pylonGeometry } from './architecture/egyptianGeometry'
import { StoneMasonry, type StoneBlock } from './architecture/StoneArchitecture'
import { TempleLinen } from './architecture/TempleLinen'

interface DunaProps {
  quality: GraphicsQuality
  reducedMotion: boolean
  event?: AnimationEvent
}

const GOLD = { color: '#ba9650', roughness: 0.5, metalness: 0.68 } as const
const LAPIS = { color: '#31556f', roughness: 0.82, metalness: 0.03 } as const
const PYLON_BASE = -2.15
const PYLON_BACK = -8.15

function Court({ quality }: { quality: GraphicsQuality }) {
  const blocks = useMemo<readonly StoneBlock[]>(() => {
    const result: StoneBlock[] = [
      { position: [0, -0.3, 0], size: [9.8, 0.46, 9.8] },
      { position: [0, -0.63, 0], size: [10.5, 0.2, 10.5] },
    ]
    for (let index = 0; index < 8; index += 1) {
      const z = -5.02 - index * 0.29
      const top = -0.15 - index * 0.27
      const floor = desertGroundHeight(0, z) - 0.05
      const height = Math.max(0.16, top - floor)
      result.push({ position: [0, top - height / 2, z], size: [2.55, height, 0.36] })
    }
    for (let index = 0; index < 3; index += 1) {
      result.push({ position: [0, -0.32 - index * 0.14, 5.04 + index * 0.3], size: [2.8 + index * 0.3, 0.24, 0.42] })
    }
    for (const side of [-1, 1]) {
      result.push({ position: [side * 4.42, -0.025, 0], size: [0.07, 0.07, 8.9] })
    }
    return result
  }, [])
  return <StoneMasonry blocks={blocks} quality={quality} finish="sandstone" color="#d8c7a7" />
}

let wing: ExtrudeGeometry | undefined
function wingGeometry() {
  if (wing) return wing
  const shape = new Shape()
  shape.moveTo(0.14, 0)
  shape.bezierCurveTo(0.38, 0.15, 0.8, 0.23, 1.08, 0.18)
  shape.lineTo(0.83, 0.04)
  shape.lineTo(0.91, 0.015)
  shape.lineTo(0.65, -0.06)
  shape.lineTo(0.73, -0.085)
  shape.lineTo(0.46, -0.13)
  shape.lineTo(0.49, -0.16)
  shape.lineTo(0.2, -0.12)
  shape.closePath()
  wing = new ExtrudeGeometry(shape, { depth: 0.026, bevelEnabled: true, bevelSize: 0.007, bevelThickness: 0.007, bevelSegments: 2 })
  return wing
}

function WingedSun() {
  return <group>
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.18, 0.18, 0.055, 40]} />
      <meshStandardMaterial {...GOLD} />
    </mesh>
    {[-1, 1].map((side) => <mesh key={side} scale={[side, 1, 1]}>
      <primitive object={wingGeometry()} attach="geometry" />
      <meshStandardMaterial {...LAPIS} />
    </mesh>)}
  </group>
}

function TribunalGate({ quality, reducedMotion }: { quality: GraphicsQuality; reducedMotion: boolean }) {
  const sandstone = stoneMaps('sandstone')
  const lintels: readonly StoneBlock[] = [
    { position: [0, PYLON_BASE - 0.02, PYLON_BACK], size: [7.25, 0.22, 2.3] },
    { position: [0, PYLON_BASE + 2.85, PYLON_BACK + 0.06], size: [2.65, 0.24, 1.25] },
    { position: [0, PYLON_BASE + 3.08, PYLON_BACK + 0.06], size: [2.85, 0.2, 1.35] },
  ]
  return <>
    <StoneMasonry blocks={lintels} quality={quality} finish="sandstone" color="#c8ad82" />
    <group position={[0, PYLON_BASE, PYLON_BACK]}>
      {[-1, 1].map((side, index) => <group key={side} position={[side * 2.15, 0, 0]}>
        <mesh castShadow={quality !== 'low'} receiveShadow={quality !== 'low'}>
          <primitive object={pylonGeometry(2.25, 3.4, 1.4)} attach="geometry" />
          <meshStandardMaterial {...sandstone} color="#ddc8a2" bumpScale={0.03} roughness={0.95} />
        </mesh>
        <DunaRelief bodyHeight={3.4} depth={1.4} seed={index} />
        <mesh position={[0, 3.4, 0]} castShadow={quality !== 'low'}>
          <primitive object={cavettoGeometry(2.02, 1.16)} attach="geometry" />
          <meshStandardMaterial {...sandstone} color="#e5cfab" bumpScale={0.02} roughness={0.9} />
        </mesh>
        <mesh position={[0, 3.33, 0.59]}>
          <boxGeometry args={[1.9, 0.105, 0.022]} />
          <meshStandardMaterial {...LAPIS} />
        </mesh>
      </group>)}
      <group position={[0, 3.08, 0.77]}><WingedSun /></group>
      {[-1, 1].map((side) => <group key={side} position={[side * 3.48, 3.42, 0.48]}>
        <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.018, 0.018, 0.66, 12]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>
        <TempleLinen quality={quality} reducedMotion={reducedMotion} phase={side} />
      </group>)}
    </group>
  </>
}

function Hypostyle({ quality }: { quality: GraphicsQuality }) {
  const maps = stoneMaps('sandstone')
  const rows = [[-3.3, 1.85], [-0.5, 1.3], [2.1, 0.78]] as const
  return <>{[-1, 1].flatMap((side) => rows.map(([z, height], index) => {
    const x = side * 6.08
    const ground = desertGroundHeight(x, z)
    return <group key={`${side}:${z}`} position={[x, ground, z]}>
      <mesh position={[0, 0.11, 0]} receiveShadow={quality !== 'low'}>
        <cylinderGeometry args={[0.66, 0.73, 0.22, 32]} />
        <meshStandardMaterial {...maps} color="#baa17a" bumpScale={0.03} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.22, 0]} castShadow={quality !== 'low'} receiveShadow={quality !== 'low'}>
        <primitive object={bundledShaftGeometry(0.34, height)} attach="geometry" />
        <meshStandardMaterial {...maps} color="#dcc6a2" bumpScale={0.025} roughness={0.94} />
      </mesh>
      <mesh position={[0, height + 0.22, 0]} castShadow={quality !== 'low'}>
        <primitive object={papyrusCapitalGeometry(0.58, 0.48)} attach="geometry" />
        <meshStandardMaterial {...maps} color="#c6b28d" bumpScale={0.02} roughness={0.9} />
      </mesh>
      <mesh position={[0, height + 0.76, 0]} castShadow={quality !== 'low'}>
        <boxGeometry args={[1.17, 0.12, 1.17]} /><meshStandardMaterial {...maps} color="#d6c29f" roughness={0.93} />
      </mesh>
      {[0.31, height + 0.18].map((y) => <mesh key={y} position={[0, y, 0]}>
        <cylinderGeometry args={[0.352, 0.352, 0.07, 40]} /><meshStandardMaterial {...LAPIS} />
      </mesh>)}
      {index === 0 && <mesh position={[0, height + 0.67, 0]}>
        <cylinderGeometry args={[0.59, 0.59, 0.035, 48]} /><meshStandardMaterial {...GOLD} />
      </mesh>}
    </group>
  }))}</>
}

function Obelisk({ side, quality }: { side: -1 | 1; quality: GraphicsQuality }) {
  const maps = stoneMaps('sandstone')
  const x = side * 4.9
  const z = -4.25
  const floor = desertGroundHeight(x, z)
  return <group position={[x, floor, z]}>
    <mesh position={[0, 0.12, 0]} receiveShadow={quality !== 'low'}><boxGeometry args={[0.75, 0.24, 0.75]} />
      <meshStandardMaterial {...maps} color="#c1a77e" roughness={0.96} />
    </mesh>
    <mesh position={[0, 0.24, 0]} castShadow={quality !== 'low'}>
      <primitive object={pylonGeometry(0.4, 2.15, 0.4)} attach="geometry" />
      <meshStandardMaterial {...maps} color="#ddcba7" bumpScale={0.02} roughness={0.92} />
    </mesh>
    <mesh position={[0, 2.53, 0]} rotation={[0, Math.PI / 4, 0]}>
      <coneGeometry args={[0.232, 0.28, 4]} /><meshStandardMaterial {...GOLD} />
    </mesh>
  </group>
}

/** El Tribunal se contempla desde su patio superior. El pilono mantiene
 * escala gracias a la cota excavada; la arena y las sombras cortas conservan
 * el mediodía, y el lapislázuli/lino evita que todo sea una mancha dorada. */
export function DunaNecropolis({ quality, reducedMotion }: DunaProps) {
  return <>


    <ScenarioAmbientLight intensity={0.25} color="#d0cbba" />
    <ScenarioHemisphereLight intensity={0.35} color="#c0d1df" groundColor="#b29a6e" />
    <ScenarioDirectionalLight position={[-6, 12, 5]} intensity={2.65} color="#fff0d2" castShadow={quality !== 'low'}
      shadow-mapSize-width={quality === 'high' ? 2048 : 1024} shadow-mapSize-height={quality === 'high' ? 2048 : 1024}
      shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-bias={-0.0006} />
    <ScenarioDirectionalLight position={[7, 6, -9]} intensity={0.55} color="#b4c7d5" />
    <DistantVista image={`/assets/scenarios/duna-vista-v1${quality === 'low' ? '-low' : ''}.webp`} />
    <DesertGround quality={quality} />
    <Court quality={quality} />
    <TribunalGate quality={quality} reducedMotion={reducedMotion} />
    <Hypostyle quality={quality} />
    <Obelisk side={-1} quality={quality} />
    <Obelisk side={1} quality={quality} />
    {quality !== 'low' && <Sparkles count={quality === 'high' ? 30 : 14} scale={[15, 1.9, 14]} size={1.1}
      speed={reducedMotion ? 0 : 0.12} color="#ddc69a" opacity={0.22} position={[0, 0.5, 0]} />}
  </>
}
