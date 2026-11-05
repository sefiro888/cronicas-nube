import { ScenarioAmbientLight, ScenarioHemisphereLight, ScenarioDirectionalLight } from './ScenarioLights'
import { Sparkles } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { BackSide, Color } from 'three'
import type { DirectionalLight, Group, Mesh, MeshStandardMaterial } from 'three'
import type { AnimationEvent } from '../../game'
import type { GraphicsQuality } from '../../store/preferences'
import { cloudTexture } from '../textures'
import { usePageVisibility } from '../usePageVisibility'
import { CitadelBasilica } from './architecture/CitadelBasilica'
import { CitadelBanner } from './architecture/CitadelBanner'
import { CitadelLowerCity } from './architecture/CitadelLowerCity'
import { DistantVista } from './architecture/DistantVista'
import { StoneColumns, StoneMasonry, type StoneBlock } from './architecture/StoneArchitecture'
import { floatingCragGeometry, terraceGeometry } from './architecture/stoneGeometry'
import { stoneMaps } from '../materials/stoneMaterial'
import { citadelSkyTexture } from './architecture/citadelSky'

interface AetherCitadelProps {
  readonly quality: GraphicsQuality
  readonly reducedMotion: boolean
  readonly event?: AnimationEvent
}

// La media diagonal del tablero es 5,20. El andén debe sostener también las
// esquinas: el antiguo radio 5,03 dejaba cuatro puntas suspendidas en el vacío.
const PLAZA_RADIUS = 5.68
const BRONZE = { color: '#9d8050', roughness: 0.52, metalness: 0.72 } as const

/** El avance del sol solo consume turnos resueltos. Una vuelta completa del
 * cielo distraía; seis grados y una variación pequeña bastan para leer tiempo. */
function DawnAtmosphere({ quality, reducedMotion, turn }: { readonly quality: GraphicsQuality; readonly reducedMotion: boolean; readonly turn: { readonly current: number } }) {
  const sun = useRef<DirectionalLight>(null)
  const sky = useRef<Mesh>(null)
  const visible = usePageVisibility()
  const progress = useRef(0)
  const dawn = useMemo(() => new Color('#ffdcab'), [])
  const daylight = useMemo(() => new Color('#ffe9cb'), [])
  useFrame(({ camera }, delta) => {
    sky.current?.position.copy(camera.position)
    if (!sun.current || !visible.current) return
    const target = Math.min(1, turn.current / 30)
    progress.current = reducedMotion ? target : progress.current + (target - progress.current) * Math.min(1, delta * 0.25)
    const amount = progress.current
    sun.current.position.set(-8 + amount * 2.4, 11, 7 - amount)
    sun.current.color.copy(dawn).lerp(daylight, amount)
  })
  return <>


    <mesh ref={sky} rotation={[0, -2.2, 0]}>
      {/* El radio anterior cortaba el panorama en las vistas amplias de foto. */}
      <sphereGeometry args={[105, 64, 32]} />
      <meshBasicMaterial map={citadelSkyTexture()} side={BackSide} fog={false} toneMapped={false} />
    </mesh>
    <ScenarioAmbientLight intensity={0.25} color="#bcc6dc" />
    <ScenarioHemisphereLight intensity={0.38} color="#b9d0ed" groundColor="#59554c" />
    {/* Clave desde la cámara: el mármol conserva relieve en la fachada. La
        antigua clave trasera y el punto de intensidad 14 borraban sus vetas. */}
    <ScenarioDirectionalLight ref={sun} position={[-8, 11, 7]} color="#ffdcab" intensity={2.6}
      castShadow={quality !== 'low'} shadow-mapSize-width={quality === 'high' ? 2048 : 1024}
      shadow-mapSize-height={quality === 'high' ? 2048 : 1024}
      shadow-camera-left={-13} shadow-camera-right={13} shadow-camera-top={13} shadow-camera-bottom={-13}
      shadow-camera-near={0.5} shadow-camera-far={45} shadow-normalBias={0.015} shadow-bias={-0.0006} />
    <ScenarioDirectionalLight position={[8, 6, -9]} color="#91afd9" intensity={0.72} />
  </>
}

function Plaza({ quality }: { readonly quality: GraphicsQuality }) {
  const marble = stoneMaps('marble')
  const limestone = stoneMaps('limestone')
  const steps = useMemo<readonly StoneBlock[]>(() => {
    const blocks: StoneBlock[] = []
    // Escalones bajos en el frente y un puente corto hacia el patio inferior.
    // La carta del Nexo queda por delante: nada cruza el centro de las filas.
    for (let index = 0; index < 4; index += 1) {
      blocks.push({ position: [0, -0.25 - index * 0.17, 5.7 + index * 0.3], size: [2.8 - index * 0.28, 0.18, 0.46] })
    }
    for (let index = 0; index < 9; index += 1) {
      blocks.push({ position: [0, -0.2 - index * 0.24, -5.3 - index * 0.23], size: [2.35, 0.25, 0.3] })
    }
    return blocks
  }, [])
  return <group>
    <mesh receiveShadow={quality !== 'low'} castShadow={quality !== 'low'}>
      <primitive attach="geometry" object={terraceGeometry(PLAZA_RADIUS)} />
      <meshStandardMaterial {...marble} color="#d9d9d1" vertexColors roughness={0.83} bumpScale={0.012} metalness={0.025} />
    </mesh>
    <mesh receiveShadow>
      <primitive attach="geometry" object={floatingCragGeometry(PLAZA_RADIUS - 0.28, 4.8, 7)} />
      <meshStandardMaterial {...limestone} color="#777c80" vertexColors roughness={1} bumpScale={0.04} metalness={0} />
    </mesh>
    <StoneMasonry quality={quality} blocks={steps} color="#d3d3c9" />
    {/* Dos juntas de bronce estrechas; no hay una enorme lámina emisiva bajo
        el tablero. La incrustación debe pertenecer al andén de piedra. */}
    {[5.29, 5.47].map((radius) => <mesh key={radius} position={[0, -0.067, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius, radius + 0.016, 128]} />
      <meshStandardMaterial {...BRONZE} />
    </mesh>)}
  </group>
}

const OUTER_PIERS = [[-4.28, -0.075, 0.8], [4.28, -0.075, 0.8], [-3.55, -0.075, 3.25], [3.55, -0.075, 3.25]] as const
const BROKEN_PIERS = [[-5.14, -0.075, -0.15], [5.14, -0.075, -0.15]] as const

function Perimeter({ quality }: { readonly quality: GraphicsQuality }) {
  const blocks = useMemo<readonly StoneBlock[]>(() => {
    const result: StoneBlock[] = []
    // Solo dos tramos laterales de balaustrada. El frente se mantiene abierto
    // para que ni postes ni arcos tapen unidades en el lado del jugador.
    for (const side of [-1, 1]) {
      result.push({ position: [side * 4.73, 0.28, 0.68], size: [0.2, 0.18, 1.7] })
      for (let index = 0; index < 5; index += 1) {
        result.push({ position: [side * 4.73, 0.06, 0.04 + index * 0.31], size: [0.09, 0.3, 0.09] })
      }
    }
    return result
  }, [])
  return <>
    <StoneColumns quality={quality} radius={0.17} height={0.65} positions={OUTER_PIERS} />
    <StoneColumns quality={quality} radius={0.18} height={0.48} positions={BROKEN_PIERS} broken />
    <StoneMasonry quality={quality} blocks={blocks} />
  </>
}

const ISLE_COLUMNS = [[-0.83, -0.06, 0.1], [0.83, -0.06, 0.1], [-0.83, -0.06, -0.86], [0.83, -0.06, -0.86]] as const
const ISLE_ROOF: readonly StoneBlock[] = [
  { position: [0, 1.55, -0.38], size: [2.15, 0.17, 1.5] },
  { position: [0, 1.72, -0.38], size: [2.35, 0.12, 1.68] },
  { position: [0, 1.85, -0.38], size: [2.06, 0.14, 1.45] },
]

/** Fragmentos habitados de la misma ciudad. Se ven sus terrazas y pórticos;
 * las antiguas islas y aves estaban muy por encima del encuadre real. */
function FloatingIsles({ quality }: { readonly quality: GraphicsQuality }) {
  const limestone = stoneMaps('limestone')
  const marble = stoneMaps('marble')
  const positions = (quality === 'high' ? [[-8.6, -3.2, -11.4], [8.6, -3.8, -12.2], [-11.4, -5.8, -8.4]]
    : [[-8.6, -3.2, -11.4], [8.6, -3.8, -12.2]]).slice(0, quality === 'low' ? 1 : undefined)
  return <>{positions.map(([x, y, z], index) => <group key={index} position={[x!, y!, z!]} rotation={[0, index * 0.22 - 0.1, 0]} scale={index === 2 ? 0.8 : 1}>
    <mesh receiveShadow>
      <primitive attach="geometry" object={terraceGeometry(1.7)} />
      <meshStandardMaterial {...marble} color="#bbc5ca" vertexColors roughness={0.9} bumpScale={0.012} metalness={0.025} />
    </mesh>
    <mesh>
      <primitive attach="geometry" object={floatingCragGeometry(1.6, 3.2, index + 15)} />
      <meshStandardMaterial {...limestone} color="#637582" vertexColors roughness={1} bumpScale={0.025} />
    </mesh>
    <StoneColumns quality={quality} height={1.56} radius={0.11} positions={ISLE_COLUMNS} color="#c2c9c8" />
    <StoneMasonry quality={quality} blocks={ISLE_ROOF} color="#c2c9c8" />
  </group>)}</>
}

function DawnClouds({ quality, reducedMotion }: { readonly quality: GraphicsQuality; readonly reducedMotion: boolean }) {
  const group = useRef<Group>(null)
  const visible = usePageVisibility()
  const banks = useMemo(() => [
    [-8, -3.0, -8.3, 10, 0.22], [7.8, -3.7, -10.4, 12, 0.24],
    [0, -4.6, -11.8, 18, 0.2], [-9.4, -2.3, -2, 10, 0.18],
    [9.2, -2.2, -0.6, 11, 0.19], [-7, -2.5, 5.7, 12, 0.2], [7.3, -3, 6, 13, 0.2],
    [-2, -5.3, 8.3, 14, 0.21], [3, -5.8, -6, 13, 0.18],
  ].slice(0, quality === 'low' ? 3 : quality === 'medium' ? 7 : 9), [quality])
  useFrame(({ clock }) => {
    if (reducedMotion || !visible.current || !group.current) return
    group.current.children.forEach((cloud, index) => {
      const bank = banks[index]!
      cloud.position.x = bank[0]! + Math.sin(clock.elapsedTime * 0.025 + index * 2) * 0.4
    })
  })
  return <group ref={group}>{banks.map(([x, y, z, scale, opacity], index) => <sprite key={index}
    position={[x!, y!, z!]} scale={[scale!, scale! * 0.3, 1]}>
    <spriteMaterial map={cloudTexture()} color={index % 3 === 0 ? '#d5ddec' : '#ced8e2'}
      transparent opacity={opacity! * 2.1} depthWrite={false} fog={false} />
  </sprite>)}</group>
}

/** La energía queda dentro del arco, sin un rectángulo blanco ni una luz
 * local que borre el volumen de la piedra. */
function PortalGlow({ reducedMotion, pulse }: { readonly reducedMotion: boolean; readonly pulse: { readonly current: number } }) {
  const material = useRef<MeshStandardMaterial>(null)
  const visible = usePageVisibility()
  useFrame(({ clock }) => {
    if (!material.current || !visible.current) return
    material.current.emissiveIntensity = 0.25 + (reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.55) * 0.04 + pulse.current * 0.2)
  })
  return <group position={[0, -0.18, -7.05]}>
    <mesh>
      <torusGeometry args={[1.38, 0.014, 6, 64, Math.PI]} />
      <meshStandardMaterial ref={material} color="#9a7b42" emissive="#d9be83" emissiveIntensity={0.25} roughness={0.4} metalness={0.6} />
    </mesh>
  </group>
}

export function AetherCitadel({ quality, reducedMotion, event }: AetherCitadelProps) {
  const pulse = useRef(0)
  const turn = useRef(0)
  useEffect(() => {
    if (event?.type === 'turn') turn.current += 1
    if (event?.type === 'turn' || event?.type === 'nexus-damage' || event?.type === 'victory') pulse.current = 1
  }, [event])
  useFrame((_, delta) => { pulse.current = Math.max(0, pulse.current - delta * 1.3) })
  return <>
    <DawnAtmosphere quality={quality} reducedMotion={reducedMotion} turn={turn} />
    <DistantVista image={`/assets/scenarios/aether-citadel-vista-v1${quality === 'low' ? '-low' : ''}.webp`} />
    <FloatingIsles quality={quality} />
    <CitadelLowerCity quality={quality} />
    <CitadelBasilica quality={quality} />
    <Plaza quality={quality} />
    <Perimeter quality={quality} />
    <CitadelBanner side={-1} reducedMotion={reducedMotion} />
    <CitadelBanner side={1} reducedMotion={reducedMotion} />
    <PortalGlow reducedMotion={reducedMotion} pulse={pulse} />
    <DawnClouds quality={quality} reducedMotion={reducedMotion} />
    {quality !== 'low' && <Sparkles count={quality === 'high' ? 24 : 12} scale={[10, 1.3, 8]} position={[0, 0.4, -0.5]}
      size={0.9} speed={reducedMotion ? 0 : 0.16} opacity={0.3} color="#f3dfaf" />}
  </>
}
