import { Sparkles, useTexture } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { DoubleSide, Shape, ShapeGeometry, SRGBColorSpace } from 'three'
import type { GraphicsQuality } from '../../store/preferences'
import { ReflectiveWater } from '../materials/ReflectiveWater'
import { stoneMaps, type StoneFinish } from '../materials/stoneMaterial'
import { timberMaps } from '../materials/timberMaterial'
import { DistantVista } from './architecture/DistantVista'
import { ShorePine } from './architecture/ShorePine'
import { StoneColumns, StoneVault } from './architecture/StoneArchitecture'
import { masonryBlockGeometry } from './architecture/stoneGeometry'
import type { FactionStageId } from './factionStages'

type Point = [number, number, number]
const SIDES = [-1, 1] as const
const TAU = Math.PI * 2

function Block({ position, size, color, finish, rotation, metalness = 0 }: {
  position: Point; size: Point; color: string; finish?: StoneFinish | 'timber'; rotation?: Point; metalness?: number
}) {
  const maps = finish === 'timber' ? timberMaps() : finish ? stoneMaps(finish) : undefined
  const stone = finish !== undefined && finish !== 'timber'
  return <mesh position={position} rotation={rotation} receiveShadow castShadow>
    {stone ? <primitive attach="geometry" object={masonryBlockGeometry(...size)} /> : <boxGeometry args={size} />}
    <meshStandardMaterial {...maps} vertexColors={stone} bumpScale={maps ? .035 : 0} color={color} roughness={.82} metalness={metalness} />
  </mesh>
}

function Band({ position, radius, tube, arc = TAU, color, glow, rotation }: {
  position: Point; radius: number; tube: number; arc?: number; color: string; glow?: string; rotation?: Point
}) {
  return <mesh position={position} rotation={rotation} receiveShadow castShadow>
    <torusGeometry args={[radius, tube, 7, 32, arc]} />
    <meshStandardMaterial color={color} roughness={.6} metalness={.35} emissive={glow} emissiveIntensity={glow ? .75 : 0} />
  </mesh>
}

function StonePlatform({ color, finish, sides = 8, depth = .9 }: {
  color: string; finish: StoneFinish; sides?: number; depth?: number
}) {
  return <mesh position={[0, -.23 - depth / 2, -.25]} rotation={[0, Math.PI / 8, 0]} castShadow receiveShadow>
    <cylinderGeometry args={[5.83, 5.45, depth, sides]} />
    <meshStandardMaterial {...stoneMaps(finish)} bumpScale={.09} color={color} roughness={.85} />
  </mesh>
}

function DawnBastion() {
  const loadedGlass = useTexture(`${import.meta.env.BASE_URL}assets/scenarios/vidriera-orden-v1.webp`)
  const glass = useMemo(() => {
    const texture = loadedGlass.clone()
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = 4
    texture.needsUpdate = true
    return texture
  }, [loadedGlass])
  useEffect(() => () => glass.dispose(), [glass])
  const window = useMemo(() => {
    const shape = new Shape()
    shape.moveTo(-.77, .55)
    shape.lineTo(.77, .55)
    shape.lineTo(.77, 2.55)
    shape.absarc(0, 2.55, .77, 0, Math.PI, false)
    shape.closePath()
    const geometry = new ShapeGeometry(shape, 20)
    const positions = geometry.getAttribute('position')
    const uv = geometry.getAttribute('uv')
    for (let index = 0; index < positions.count; index += 1) {
      uv.setXY(index, (positions.getX(index) + .77) / 1.54, (positions.getY(index) - .55) / 2.77)
    }
    return geometry
  }, [])
  useEffect(() => () => window.dispose(), [window])
  return <>
    <StonePlatform color="#c2b490" finish="limestone" />
    <Block position={[0, -.6, -4.92]} size={[9.6, .74, 3.25]} color="#aaa080" finish="limestone" />
    {SIDES.map((side) => <group key={side} position={[side * 3.35, -.22, -5.8]} scale={[1, .78, 1]} rotation={[0, side * .13, 0]}>
      <Block position={[0, .28, 0]} size={[2.5, .56, 1.45]} color="#9f967c" finish="limestone" />
      {SIDES.map((post) => <group key={post}>
        <Block position={[post * .94, 1.62, 0]} size={[.46, 2.8, .66]} color="#d0c4a3" finish="limestone" />
        <Block position={[post * .94, 2.52, .39]} size={[.6, .18, .18]} color="#b6954b" metalness={.4} />
      </group>)}
      <group position={[0, 2.55, 0]}>
        <StoneVault radius={.77} thickness={.36} depth={.64} segments={11} color="#d5c29b" finish="limestone" quality="medium" />
      </group>
      <Band position={[0, 2.55, .2]} radius={.83} tube={.045} arc={Math.PI} color="#d4a64c" />
      <mesh position={[0, 0, .11]}>
        <primitive attach="geometry" object={window} />
        <meshStandardMaterial map={glass} emissiveMap={glass} emissive="#dcbf8b" emissiveIntensity={.55}
          roughness={.43} metalness={.08} side={DoubleSide} />
      </mesh>
      <mesh position={[0, .9, .74]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[.47, .39, .16, 10]} />
        <meshStandardMaterial color="#aa8140" metalness={.53} roughness={.45} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => <Block key={i}
        position={[.23 * Math.cos(i * TAU / 8), .9 + .23 * Math.sin(i * TAU / 8), .84]}
        size={[.22, .045, .035]} rotation={[0, 0, i * TAU / 8]} color="#ffdb7a" />)}
    </group>)}
  </>
}

function OlympusAcropolis() {
  return <>
    <StonePlatform color="#e3ddd1" finish="marble" depth={1.65} />
    <Block position={[0, -.83, -5.4]} size={[11.3, 1.21, 3.85]} color="#bcb5a6" finish="limestone" />
    {SIDES.map((side) => <group key={side} position={[side * 4.1, -.2, -6.15]} scale={[1, .78, 1]} rotation={[0, side * .19, 0]}>
      {[0, 1, 2].map((step) => <Block key={step} position={[0, .08 + step * .16, -.1]}
        size={[3.5 - .25 * step, .16, 1.7 - .29 * step]} color="#dacdb9" finish="marble" />)}
      {[-1.2, 0, 1.2].map((x) => <group key={x} position={[x, .48, 0]}>
        <Block position={[0, .12, 0]} size={[.64, .24, .64]} color="#dcd4c6" finish="marble" />
        <StoneColumns radius={.24} height={2.1} positions={[[0, .23, 0]]} finish="marble" color="#e4d9cb" quality="medium" />
        <Block position={[0, 2.27, 0]} size={[.57, .23, .59]} color="#c6a267" finish="marble" />
      </group>)}
      <Block position={[0, 2.99, 0]} size={[3.36, .34, .81]} color="#dcd5ca" finish="marble" />
      <Block position={[0, 3.16, .42]} size={[3.34, .1, .11]} color="#235875" />
      {Array.from({ length: 8 }, (_, i) => <Block key={i} position={[(i - 3.5) * .39, 3.04, .43]}
        size={[.24, .09, .05]} color="#b98638" metalness={.5} />)}
    </group>)}
  </>
}

function TerciosBastion() {
  return <>
    <StonePlatform color="#82755f" finish="sandstone" />
    <Block position={[0, -.42, 0]} size={[13, .28, 14]} color="#8f7d64" finish="sandstone" />
    {SIDES.map((side) => <group key={side} position={[side * 4.65, -.18, -4.3]} rotation={[0, side * .39, 0]}>
      <Block position={[0, .48, -.1]} size={[2.2, .96, 2.3]} color="#8c7961" finish="sandstone" />
      {[-.81, -.27, .27, .81].map((x) => <Block key={x} position={[x, 1.05, .84]}
        size={[.38, .45, .4]} color="#a48b6b" finish="sandstone" />)}
      {[0, 1, 2].map((i) => <Block key={i} position={[-.6 + .4 * i, .14, .98]}
        size={[.34, .3, .36]} color="#705943" finish="timber" />)}
      <Block position={[.12, 1.55, -.34]} size={[.06, 2.3, .06]} color="#554333" finish="timber" />
      <Block position={[.5, 2.36, -.34]} size={[.76, .41, .04]} color={side === 1 ? '#b4a387' : '#7e4436'} rotation={[0, 0, -.14]} />
      <mesh position={[0, 1.12, .33]} rotation={[Math.PI / 2.8, 0, 0]} castShadow>
        <cylinderGeometry args={[.12, .19, 1.22, 12]} />
        <meshStandardMaterial color="#44382d" metalness={.57} roughness={.56} />
      </mesh>
    </group>)}
    {[-1, 0, 1].map((i) => <Block key={i} position={[i * 2.4, .16, -5.55]} size={[1.9, .68, .54]} color="#917b60" finish="sandstone" />)}
  </>
}

function VoidThreshold() {
  return <>
    <StonePlatform color="#51445e" finish="basalt" depth={1.9} />
    {SIDES.map((side) => <group key={side} position={[side * 3.6, 1.26, -5.65]} scale={[.88, .87, .88]} rotation={[.13, side * -.4, side * .26]}>
      <group scale={[.9, 1.15, 1]}>
        <Band position={[0, 0, 0]} radius={1.53} tube={.2} arc={Math.PI * 1.61} color="#61566f" rotation={[0, 0, .28]} />
        <Band position={[0, 0, .06]} radius={1.34} tube={.045} arc={Math.PI * 1.63} color="#a666bd" glow="#a937d1" rotation={[0, 0, .27]} />
      </group>
      <Band position={[side * .28, -.18, -.25]} radius={1.65} tube={.08} arc={Math.PI * 1.35} color="#7d5fa3" glow="#3d266a" rotation={[.3, .17, -.29]} />
      {Array.from({ length: 7 }, (_, i) => {
        const a = .6 + i * .67
        return <mesh key={i} position={[Math.cos(a) * 1.89, Math.sin(a) * 1.67, -.11 + .07 * i]} rotation={[a, i * .37, a * .7]}>
          <dodecahedronGeometry args={[.15 + (i % 3) * .06, 0]} />
          <meshStandardMaterial {...stoneMaps('basalt')} color="#8a629e" emissive="#471959" emissiveIntensity={.35} />
        </mesh>
      })}
      <pointLight color="#aa52f0" intensity={7} distance={5} />
    </group>)}
  </>
}

function PlagueCrypt({ quality, reducedMotion }: { quality: GraphicsQuality; reducedMotion: boolean }) {
  return <>
    <ReflectiveWater quality={quality === 'high' ? 'medium' : 'low'} reducedMotion={reducedMotion} color="#31433a" />
    <StonePlatform color="#6d7760" finish="granite" />
    {SIDES.map((side) => <group key={side} position={[side * 3.95, -.16, -5.35]} scale={[1, .75, 1]} rotation={[0, side * .28, side * .09]}>
      <Block position={[0, .25, 0]} size={[2.02, .5, 1.54]} color="#69755d" finish="granite" />
      <Block position={[0, .7, 0]} size={[1.65, .53, .95]} color="#67705c" finish="granite" />
      <Block position={[0, 1, 0]} size={[1.82, .17, 1.1]} color="#87907a" finish="granite" />
      {SIDES.map((post) => <group key={post}>
        <Block position={[post * .84, 1.44, -.48]} size={[.4, 2.9, .47]} color="#596453" finish="granite" rotation={[0, 0, post * -.07]} />
        <Block position={[post * .46, 2.82, -.48]} size={[.24, 1.13, .4]} color="#63735c" finish="granite" rotation={[0, 0, post * .54]} />
      </group>)}
      {Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[-.9 + (i % 5) * .37, .1 + i % 3 * .09, .45 + (i % 4) * .21]}>
        <sphereGeometry args={[.12 + (i % 3) * .028, 9, 6]} />
        <meshStandardMaterial color={i % 3 ? '#70804c' : '#b0bc72'} emissive="#40552e" emissiveIntensity={.38} />
      </mesh>)}
    </group>)}
  </>
}

function GoblinScrapyard() {
  return <>
    <StonePlatform color="#65564f" finish="basalt" />
    <Block position={[0, -.67, -.8]} size={[13, .65, 13.2]} color="#5e554e" finish="basalt" />
    {SIDES.map((side) => <group key={side} position={[side * 4.1, -.26, -4.65]} rotation={[0, side * .28, 0]}>
      <Block position={[-.77, 1.08, -.16]} size={[.25, 2.22, .29]} color="#66514a" metalness={.4} rotation={[0, 0, -.16]} />
      <Block position={[.71, 1.08, -.13]} size={[.25, 2.22, .3]} color="#595b58" metalness={.5} rotation={[0, 0, .09]} />
      <Block position={[0, 2.2, -.12]} size={[2.04, .22, .35]} color="#946441" metalness={.4} rotation={[0, 0, side * -.12]} />
      <Block position={[.1, 1.76, .03]} size={[.23, .45, .22]} color="#3e4930" />
      <pointLight position={[.1, 1.65, .24]} color="#c3ea45" intensity={5} distance={4} />
      {Array.from({ length: 11 }, (_, i) => <Block key={i} position={[(i % 4 - 1.5) * .43, .14 + (i % 3) * .18, .1 + (i % 5) * .22]}
        size={[.52, .12, .36]} rotation={[.15 * i, i * .7, i * .46]}
        color={i % 3 === 0 ? '#9a5732' : '#4e5353'} metalness={.51} />)}
    </group>)}
    {SIDES.map((side) => <group key={side} position={[side * 4.75, -.24, .1]} rotation={[0, side * .12, 0]}>
      {[-.26, .26].map((x) => <Block key={x} position={[x, .09, 0]} size={[.09, .07, 7.7]} color="#927555" metalness={.65} />)}
      {Array.from({ length: 11 }, (_, i) => <Block key={i} position={[0, .03, (i - 5) * .68]} size={[.77, .08, .17]} color="#736048" finish="timber" />)}
    </group>)}
  </>
}

function SampoLake({ quality, reducedMotion }: { quality: GraphicsQuality; reducedMotion: boolean }) {
  return <>
    <ReflectiveWater quality={quality === 'high' ? 'medium' : 'low'} reducedMotion={reducedMotion} color="#294b57" />
    <StonePlatform color="#6d7777" finish="granite" />
    {SIDES.map((side) => <group key={side} position={[side * 4.45, -.23, -3.8]} rotation={[0, side * .18, 0]}>
      {Array.from({ length: 6 }, (_, i) => <Block key={i} position={[0, .05, i * .29]} size={[1.01, .15, .27]} color="#625a4c" finish="timber" />)}
      {SIDES.map((post) => <Block key={post} position={[post * .46, .43, .02]} size={[.12, .98, .15]} color="#4a463b" finish="timber" />)}
      {[0, 1, 2].map((i) => <group key={i} position={[side * (.15 + i * .5), -.07, -1.85 - i * .36]}>
        <mesh position={[0, -.64, 0]} scale={[.9, .77, 1.15]} rotation={[0, i * .8, 0]} castShadow receiveShadow>
          <dodecahedronGeometry args={[1, 1]} />
          <meshStandardMaterial {...stoneMaps('granite')} color="#75817b" roughness={1} bumpScale={.045} />
        </mesh>
        <ShorePine seed={i + side * 4} />
      </group>)}
    </group>)}
    <group position={[0, 1.22, -5.9]} scale={[.9, .88, .9]} rotation={[.06, -.09, .03]}>
      <Block position={[0, -1.25, 0]} size={[2.05, .57, 1.09]} color="#58696a" finish="granite" />
      <Band position={[0, 0, 0]} radius={1.17} tube={.15} color="#8e7652" />
      <Band position={[0, 0, .1]} radius={.99} tube={.04} color="#8bb5ac" glow="#3a8985" />
      {Array.from({ length: 8 }, (_, i) => <Block key={i}
        position={[Math.cos(i * TAU / 8) * .53, Math.sin(i * TAU / 8) * .53, .025]}
        size={[1.08, .11, .11]} color="#826345" finish="timber" rotation={[0, 0, i * TAU / 8]} />)}
      <mesh position={[0, 0, .19]}>
        <icosahedronGeometry args={[.31, 1]} />
        <meshStandardMaterial color="#5d9d9e" emissive="#58afa6" emissiveIntensity={.75} />
      </mesh>
    </group>
  </>
}

const STAGES = {
  'bastion-alba': { model: DawnBastion, key: '#ffdfaa', fill: '#a0b6d0', ambient: '#a9a59a', mote: '#e6c789' },
  'acropolis-olimpo': { model: OlympusAcropolis, key: '#ffe5be', fill: '#88b9d7', ambient: '#a2b9c9', mote: '#f4dca2' },
  'baluarte-tercios': { model: TerciosBastion, key: '#ecd0a1', fill: '#9db0cc', ambient: '#aa9f8b', mote: '#d4b994' },
  'umbral-vacio': { model: VoidThreshold, key: '#d8b3f3', fill: '#829bdc', ambient: '#9e8bab', mote: '#cf83f4' },
  'cripta-plaga': { model: PlagueCrypt, key: '#cedac1', fill: '#82b1a7', ambient: '#91a493', mote: '#b0c77d' },
  'desguace-goblin': { model: GoblinScrapyard, key: '#e8c3a3', fill: '#8ca0b4', ambient: '#a0988e', mote: '#d1e565' },
  'lago-kalevala': { model: SampoLake, key: '#bcd8e7', fill: '#92c6b9', ambient: '#a1b8c3', mote: '#8cd8c6' },
} satisfies Record<FactionStageId, { model: (props: { quality: GraphicsQuality; reducedMotion: boolean }) => React.JSX.Element; key: string; fill: string; ambient: string; mote: string }>

export default function FactionStage({ scenario, quality, reducedMotion }: {
  scenario: FactionStageId; quality: GraphicsQuality; reducedMotion: boolean
}) {
  const { model: Model, key, fill, ambient, mote } = STAGES[scenario]
  const shadows = {
    castShadow: quality !== 'low', 'shadow-mapSize-width': quality === 'high' ? 2048 : 1024,
    'shadow-mapSize-height': quality === 'high' ? 2048 : 1024, 'shadow-camera-left': -12,
    'shadow-camera-right': 12, 'shadow-camera-top': 12, 'shadow-camera-bottom': -12, 'shadow-bias': -.0006,
  }
  return <group name={scenario}>
    <ambientLight color={ambient} intensity={.29} />
    <hemisphereLight color={fill} groundColor={ambient} intensity={.38} />
    <directionalLight color={key} position={[-7, 10, 6]} intensity={2.1} {...shadows} />
    <directionalLight color={fill} position={[7, 5, -9]} intensity={.65} />
    <DistantVista image={`/assets/scenarios/${scenario}-vista-v1${quality === 'low' ? '-low' : ''}.webp`} />
    <Model quality={quality} reducedMotion={reducedMotion} />
    {quality !== 'low' && !reducedMotion && <Sparkles position={[0, .9, -3]} scale={[12, 2, 9]}
      count={quality === 'high' ? 36 : 20} color={mote} size={1.45} speed={.16} opacity={.36} />}
  </group>
}
