import { ScenarioAmbientLight, ScenarioHemisphereLight, ScenarioDirectionalLight } from './ScenarioLights'
import type { AnimationEvent } from '../../game'
import type { GraphicsQuality } from '../../store/preferences'
import { AtmosphericPlumes, type PlumeVent } from '../materials/AtmosphericPlumes'
import { BestiaryRemains } from './architecture/BestiaryRemains'
import { DistantVista } from './architecture/DistantVista'

interface BestiaryRavineProps {
  readonly quality: GraphicsQuality
  readonly reducedMotion: boolean
  readonly event?: AnimationEvent
}
const MIST: readonly PlumeVent[] = [
  { position: [-6.6, -0.4, -5.8], spread: 3.4, height: 1.5, density: 0.13, color: '#aab7ad', seed: 6 },
  { position: [6.3, -0.4, -5.5], spread: 3.6, height: 1.4, density: 0.14, color: '#b3bcb0', seed: 9 },
]

/** El tamaño se cuenta con vestigios integrados en roca. Las criaturas
 * jugables siguen siendo cartas, sin poblar el tablero con otra miniatura. */
export function BestiaryRavine({ quality, reducedMotion }: BestiaryRavineProps) {
  return <>
    <ScenarioAmbientLight intensity={0.26} color="#b6c3bd" />
    <ScenarioHemisphereLight intensity={0.34} color="#c5d6d4" groundColor="#535c45" />
    <ScenarioDirectionalLight position={[-7, 12, 6]} intensity={1.8} color="#e1e8dd"
      castShadow={quality !== 'low'} shadow-mapSize-width={quality === 'high' ? 2048 : 1024}
      shadow-mapSize-height={quality === 'high' ? 2048 : 1024}
      shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12}
      shadow-bias={-0.0006} />
    <ScenarioDirectionalLight position={[8, 6, -7]} intensity={0.42} color="#b2c8ce" />
    <DistantVista image={`/assets/scenarios/bestiary-vista-v1${quality === 'low' ? '-low' : ''}.webp`} />
    <BestiaryRemains quality={quality} />
    <AtmosphericPlumes vents={MIST} quality={quality} reducedMotion={reducedMotion} />
  </>
}
