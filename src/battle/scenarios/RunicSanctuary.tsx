import { ScenarioAmbientLight, ScenarioHemisphereLight, ScenarioDirectionalLight } from './ScenarioLights'
import { Sparkles, Stars } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { AdditiveBlending, DoubleSide, Vector2 } from 'three'
import type { Mesh, MeshBasicMaterial, PointLight } from 'three'
import type { AnimationEvent } from '../../game'
import type { GraphicsQuality } from '../../store/preferences'
import { AtmosphericPlumes, type PlumeVent } from '../materials/AtmosphericPlumes'
import { ReflectiveWater } from '../materials/ReflectiveWater'
import { stoneMaps } from '../materials/stoneMaterial'
import { cloudTexture, glowTexture } from '../textures'
import { DistantVista } from './architecture/DistantVista'
import { megalithGeometry } from './architecture/megalithGeometry'
import { RuneInscription } from './architecture/RuneInscription'
import { sanctuaryIslandGeometry } from './architecture/sanctuaryIslandGeometry'
import { StoneMasonry, type StoneBlock } from './architecture/StoneArchitecture'

interface SanctuaryProps {
  quality: GraphicsQuality
  reducedMotion: boolean
  event?: AnimationEvent
}

const MIST: readonly PlumeVent[] = [
  { position: [-7.4, -0.65, -2.8], height: 1.1, spread: 5, density: 0.2, color: '#7d959e', seed: 2 },
  { position: [7.4, -0.65, -5.4], height: 1.4, spread: 5.2, density: 0.24, color: '#74838e', seed: 5 },
  { position: [-1, -0.65, -11.4], height: 1.8, spread: 7.5, density: 0.25, color: '#7c9096', seed: 7 },
]

const PAVING: readonly StoneBlock[] = [-1, 1].flatMap((flank) => Array.from({ length: 11 }, (_, index): StoneBlock[] => {
  const along = (index - 5) * 0.7
  const side: StoneBlock = { position: [flank * 4.42, -0.06, along], size: [0.62, 0.08, 0.48],
    rotation: [0, Math.PI / 2 + Math.sin(index * 3) * 0.045, 0] }
  const end: StoneBlock = { position: [along, -0.06, flank * 4.42], size: [0.62, 0.08, 0.48],
    rotation: [0, Math.sin(index * 2) * 0.045, 0] }
  return Math.abs(along) < 1.1 ? [side] : [side, end]
}).flat())

const STEPS: readonly StoneBlock[] = [
  ...Array.from({ length: 4 }, (_, index): StoneBlock => ({
    position: [0, -0.28 - index * 0.15, 4.92 + index * 0.52], size: [2.8 - index * 0.3, 0.25, 0.65],
    rotation: [0, index * 0.014, 0],
  })),
  ...Array.from({ length: 3 }, (_, index): StoneBlock => ({
    position: [0.2, -0.35 - index * 0.18, -5.05 - index * 0.58], size: [2.6 - index * 0.24, 0.3, 0.7],
    rotation: [0.015, -index * 0.02, 0.01],
  })),
]

const BOWL = [[0, 0], [0.16, 0], [0.29, 0.12], [0.31, 0.2], [0.26, 0.2], [0.2, 0.1], [0, 0.08]].map(([r, y]) => new Vector2(r!, y!))

const STONES = [
  [-5.5, -0.4, -3.8, 2.2, 0.82, 11, 0.16], [-5.65, -0.4, -0.7, 1.65, 0.72, 17, -0.12],
  [-5.35, -0.4, 2.4, 0.9, 0.8, 23, 0.3], [5.55, -0.4, -3.5, 2.45, 0.78, 31, -0.16],
  [5.65, -0.4, -0.2, 1.2, 0.9, 37, 0.14], [5.3, -0.4, 2.7, 0.68, 0.8, 43, -0.2],
] as const

type Pulse = { readonly current: number }

function InscribedStone({ width, height, depth, seed, pulse, reducedMotion, quality, broken = false, color = '#7d8b8c' }: {
  width: number; height: number; depth: number; seed: number; pulse: Pulse;
  reducedMotion: boolean; quality: GraphicsQuality; broken?: boolean; color?: string
}) {
  const maps = stoneMaps('granite')
  return <>
    <mesh name={`sanctuary-stone-${seed}`} castShadow={quality !== 'low'} receiveShadow={quality !== 'low'}>
      <primitive object={megalithGeometry(width, height, depth, seed, broken)} attach="geometry" />
      <meshStandardMaterial {...maps} color={color} bumpScale={0.035} roughness={0.94} vertexColors metalness={0.015} />
    </mesh>
    {!broken && <RuneInscription width={width} height={height} depth={depth} seed={seed}
      pulse={pulse} reducedMotion={reducedMotion} />}
  </>
}

function Island({ quality }: { quality: GraphicsQuality }) {
  const maps = stoneMaps('granite')
  return <>
    <mesh receiveShadow={quality !== 'low'} castShadow={quality !== 'low'}>
      <primitive object={sanctuaryIslandGeometry()} attach="geometry" />
      <meshStandardMaterial {...maps} color="#687b7f" bumpScale={0.035} roughness={0.96} metalness={0.02} />
    </mesh>
    <StoneMasonry blocks={PAVING} quality={quality} finish="granite" color="#7b8982" />
    <StoneMasonry blocks={STEPS} quality={quality} finish="granite" color="#718284" />
  </>
}

function StandingStones({ quality, pulse, reducedMotion }: SanctuaryProps & { pulse: Pulse }) {
  const maps = stoneMaps('granite')
  return <>{STONES.map(([x, y, z, height, width, seed, turn], index) => <group key={seed} position={[x, y, z]}>
    <mesh position={[0, -0.55, 0]} receiveShadow={quality !== 'low'}>
      <primitive object={megalithGeometry(1.6, 0.58, 1.5, seed + 1, true)} attach="geometry" />
      <meshStandardMaterial {...maps} color="#556b6b" bumpScale={0.035} roughness={0.96} vertexColors />
    </mesh>
    <group rotation={[0.015 * (index - 2), turn, index % 2 === 0 ? 0.035 : -0.025]}>
      <InscribedStone width={width} height={height} depth={width * 0.72} seed={seed} pulse={pulse}
        reducedMotion={reducedMotion} quality={quality} broken={index === 5} />
    </group>
    {index % 2 === 0 && <mesh position={[0.6, -0.2, 0.8]} rotation={[0.1, 0.4, Math.PI / 2]}>
      <primitive object={megalithGeometry(width * 0.8, 1.1, width * 0.55, seed + 3, true)} attach="geometry" />
      <meshStandardMaterial {...maps} color="#627879" bumpScale={0.035} roughness={0.95} vertexColors />
    </mesh>}
  </group>)}</>
}

function Dolmen({ quality, pulse, reducedMotion }: SanctuaryProps & { pulse: Pulse }) {
  const maps = stoneMaps('granite')
  const veil = useRef<Mesh>(null)
  const light = useRef<PointLight>(null)
  useFrame(({ clock }) => {
    if (veil.current) (veil.current.material as MeshBasicMaterial).opacity = 0.11 + (reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.4) * 0.025 + pulse.current * 0.04)
    if (light.current) light.current.intensity = 2.4 + (reducedMotion ? 0 : pulse.current * 1.5)
  })
  return <group position={[0, -1.8, -7.5]}>
    {/* El lago está a y=-0,72: la corona de este zócalo queda por encima
        del agua para que la portada no parezca flotar al girar la cámara. */}
    <mesh position={[0, 0.85, 0]} receiveShadow={quality !== 'low'} castShadow={quality !== 'low'}>
      <primitive object={megalithGeometry(5.1, 0.58, 1.65, 69, true)} attach="geometry" />
      <meshStandardMaterial {...maps} color="#637879" bumpScale={0.035} roughness={0.96} vertexColors />
    </mesh>
    {[-1.7, 1.7].map((x, index) => <group key={x} position={[x, 0, 0]} rotation={[0, index ? -0.04 : 0.03, index ? -0.025 : 0.025]}>
      <InscribedStone width={0.85} height={2.7} depth={0.95} seed={61 + index * 6}
        pulse={pulse} reducedMotion={reducedMotion} quality={quality} color="#a0aaa7" />
    </group>)}
    {[[-0.97, 2.9, 0.68, 73], [1.49, 1.96, 0.61, 79]].map(([x, width, height, seed]) =>
      <mesh key={seed} position={[x!, 2.63, 0]} rotation={[0, 0.008, x! > 0 ? -0.026 : 0.013]}
        castShadow={quality !== 'low'} receiveShadow={quality !== 'low'}>
        <primitive object={megalithGeometry(width!, height!, 1.12, seed!, true)} attach="geometry" />
        <meshStandardMaterial {...maps} color="#a0aaa7" bumpScale={0.04} roughness={0.94} vertexColors />
      </mesh>)}
    {/* El velo es bruma recortada, no una lámina rectangular luminosa. */}
    <mesh ref={veil} position={[0, 1.85, 0.08]}>
      <planeGeometry args={[2.55, 1.9]} />
      <meshBasicMaterial map={cloudTexture()} color="#82b6a9" transparent opacity={0.11} depthWrite={false} side={DoubleSide} />
    </mesh>
    <pointLight ref={light} position={[0, 2.1, 0.7]} color="#72b6ab" intensity={2.4} distance={5} />
  </group>
}

function ColdBrazier({ x, quality }: { x: number; quality: GraphicsQuality }) {
  const maps = stoneMaps('granite')
  return <group position={[x, -0.08, 4.45]}>
    <mesh castShadow={quality !== 'low'}>
      <primitive object={megalithGeometry(0.55, 0.42, 0.55, x < 0 ? 81 : 83)} attach="geometry" />
      <meshStandardMaterial {...maps} color="#71888a" bumpScale={0.035} roughness={0.9} vertexColors />
    </mesh>
    <mesh position={[0, 0.45, 0]}>
      <latheGeometry args={[BOWL, 32]} />
      <meshStandardMaterial {...maps} color="#8b9b95" bumpScale={0.025} roughness={0.85} />
    </mesh>
    <sprite position={[0, 0.74, 0]} scale={[0.55, 0.85, 1]}>
      <spriteMaterial map={glowTexture('arcane')} color="#97cabd" transparent opacity={0.32} blending={AdditiveBlending} depthWrite={false} />
    </sprite>
    <pointLight position={[0, 0.75, 0]} color="#8ecabc" intensity={1.3} distance={3.5} />
  </group>
}

/** Isla megalítica en un lago nocturno. La ruina protagonista se apoya en un
 * patio hundido para entrar en el encuadre real sin reducir su escala; agua,
 * granito y niebla separan planos sin competir con las cartas. */
export function RunicSanctuary({ quality, reducedMotion, event }: SanctuaryProps) {
  const pulse = useRef(0)
  useFrame((_, delta) => { pulse.current = Math.max(0, pulse.current - delta * 0.8) })
  useEffect(() => {
    if (!reducedMotion && (event?.type === 'turn' || event?.type === 'nexus-damage' || event?.type === 'victory')) pulse.current = 1
  }, [event, reducedMotion])
  return <>


    <ScenarioAmbientLight intensity={0.32} color="#9ba9b6" />
    <ScenarioHemisphereLight intensity={0.36} color="#b1c2cd" groundColor="#344841" />
    <ScenarioDirectionalLight position={[-9, 11, 7]} intensity={2.05} color="#d0dce5" castShadow={quality !== 'low'}
      shadow-mapSize-width={quality === 'high' ? 2048 : 1024} shadow-mapSize-height={quality === 'high' ? 2048 : 1024}
      shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-bias={-0.0006} />
    <ScenarioDirectionalLight position={[6, 5, -9]} intensity={0.6} color="#829bba" />
    <Stars radius={60} depth={20} count={quality === 'high' ? 450 : quality === 'medium' ? 240 : 80}
      factor={1.1} saturation={0.1} fade speed={0} />
    <DistantVista image={`/assets/scenarios/sanctuary-vista-v1${quality === 'low' ? '-low' : ''}.webp`} />
    <ReflectiveWater quality={quality} reducedMotion={reducedMotion} color="#23363e" />
    <Island quality={quality} />
    <StandingStones quality={quality} reducedMotion={reducedMotion} pulse={pulse} />
    <Dolmen quality={quality} reducedMotion={reducedMotion} pulse={pulse} />
    <ColdBrazier x={-4.55} quality={quality} />
    <ColdBrazier x={4.55} quality={quality} />
    <AtmosphericPlumes vents={MIST} quality={quality} reducedMotion={reducedMotion} />
    {quality !== 'low' && <Sparkles count={quality === 'high' ? 24 : 12} scale={[13, 1.6, 12]} size={1.25}
      speed={reducedMotion ? 0 : 0.12} color="#a2cbbb" opacity={0.28} position={[0, 0.4, 0]} />}
  </>
}
