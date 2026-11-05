import { ScenarioAmbientLight, ScenarioHemisphereLight, ScenarioDirectionalLight } from './ScenarioLights'
import type { AnimationEvent } from '../../game'
import type { GraphicsQuality } from '../../store/preferences'
import { DistantVista } from './architecture/DistantVista'
import { SolarCourtArchitecture } from './architecture/SolarCourtArchitecture'

interface SolarCourtProps {
  readonly quality: GraphicsQuality
  readonly reducedMotion: boolean
  readonly event?: AnimationEvent
}

/** Estuco vivo bajo sol alto: la identidad solar no depende de lava ni de
 * un filtro naranja. Las sombras frías conservan el relieve del mosaico. */
export function SolarCourt({ quality }: SolarCourtProps) {
  return <>
    <ScenarioAmbientLight intensity={0.25} color="#c3cbd2" />
    <ScenarioHemisphereLight intensity={0.32} color="#c3daee" groundColor="#9b866a" />
    <ScenarioDirectionalLight position={[-5, 14, 5]} intensity={2.1} color="#fff0d0"
      castShadow={quality !== 'low'} shadow-mapSize-width={quality === 'high' ? 2048 : 1024}
      shadow-mapSize-height={quality === 'high' ? 2048 : 1024}
      shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12}
      shadow-bias={-0.0006} />
    <ScenarioDirectionalLight position={[8, 6, -6]} intensity={0.42} color="#b1cbe3" />
    <DistantVista image={`/assets/scenarios/sol-vista-v1${quality === 'low' ? '-low' : ''}.webp`} />
    <SolarCourtArchitecture quality={quality} />
  </>
}
