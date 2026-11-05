import { ScenarioAmbientLight, ScenarioHemisphereLight, ScenarioDirectionalLight } from './ScenarioLights'
import type { AnimationEvent } from '../../game'
import type { GraphicsQuality } from '../../store/preferences'
import { AtmosphericPlumes, type PlumeVent } from '../materials/AtmosphericPlumes'
import { ReflectiveWater } from '../materials/ReflectiveWater'
import { DistantVista } from './architecture/DistantVista'
import { GhatArchitecture } from './architecture/GhatArchitecture'
import { GhatLamps } from './architecture/GhatLamps'
import { ghatRiverGeometry } from './architecture/wheelGeometry'

interface WheelGhatProps {
  readonly quality: GraphicsQuality
  readonly reducedMotion: boolean
  readonly event?: AnimationEvent
}
const MIST: readonly PlumeVent[] = [
  { position: [-6.9, -1.25, -6.7], spread: 4.5, height: 1.2, density: 0.12, color: '#a4b7c3', seed: 4 },
  { position: [6.9, -1.25, -7.6], spread: 4.5, height: 1.3, density: 0.13, color: '#a8b6c5', seed: 8 },
]

/** El río ocupa márgenes visibles y recibe las escaleras; no queda escondido
 * a diecinueve metros. La rueda es tallada, con vanos reales y sombra fría. */
export function WheelGhat({ quality, reducedMotion }: WheelGhatProps) {
  return <>
    <ScenarioAmbientLight intensity={0.24} color="#a8b7cb" />
    <ScenarioHemisphereLight intensity={0.35} color="#b4c7df" groundColor="#686064" />
    <ScenarioDirectionalLight position={[-6, 12, 5]} intensity={1.8} color="#f5d6b0"
      castShadow={quality !== 'low'} shadow-mapSize-width={quality === 'high' ? 2048 : 1024}
      shadow-mapSize-height={quality === 'high' ? 2048 : 1024}
      shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12}
      shadow-bias={-0.0006} />
    <ScenarioDirectionalLight position={[8, 6, -7]} intensity={0.5} color="#8da9db" />
    <DistantVista image={`/assets/scenarios/wheel-vista-v1${quality === 'low' ? '-low' : ''}.webp`} />
    <ReflectiveWater quality={quality} reducedMotion={reducedMotion} level={-1.4}
      radius={23} color="#182e3a" geometry={ghatRiverGeometry()} />
    <GhatArchitecture quality={quality} />
    <GhatLamps quality={quality} reducedMotion={reducedMotion} />
    <AtmosphericPlumes vents={MIST} quality={quality} reducedMotion={reducedMotion} />
  </>
}
