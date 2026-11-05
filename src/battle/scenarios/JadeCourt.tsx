import { ScenarioAmbientLight, ScenarioHemisphereLight, ScenarioDirectionalLight } from './ScenarioLights'
import { Sparkles } from '@react-three/drei'
import type { AnimationEvent } from '../../game'
import type { GraphicsQuality } from '../../store/preferences'
import { AtmosphericPlumes, type PlumeVent } from '../materials/AtmosphericPlumes'
import { DistantVista } from './architecture/DistantVista'
import { JadeBronzeDing, JadeCourtFloor } from './architecture/JadeCourtObjects'
import { JadeMoonGate, JadePavilion } from './architecture/JadePavilion'

interface JadeCourtProps {
  readonly quality: GraphicsQuality
  readonly reducedMotion: boolean
  readonly event?: AnimationEvent
}
const INCENSE: readonly PlumeVent[] = [
  { position: [6.15, 0.55, -3.5], spread: 0.7, height: 1.8, density: 0.09, color: '#c1c7bb', seed: 11 },
  { position: [-6, -0.3, -6.8], spread: 4, height: 1.1, density: 0.1, color: '#a6b5b6', seed: 17 },
]

/** La corte expresa administración solemne: laca, bronce ritual y aleros
 * construidos. El amanecer cálido conserva sombras frías y piedra legible. */
export function JadeCourt({ quality, reducedMotion }: JadeCourtProps) {
  return <>
    <ScenarioAmbientLight intensity={0.25} color="#bfc7ca" />
    <ScenarioHemisphereLight intensity={0.35} color="#c9dbe2" groundColor="#666052" />
    <ScenarioDirectionalLight position={[-7, 12, 5]} intensity={2} color="#ffdfaf"
      castShadow={quality !== 'low'} shadow-mapSize-width={quality === 'high' ? 2048 : 1024}
      shadow-mapSize-height={quality === 'high' ? 2048 : 1024}
      shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12}
      shadow-bias={-0.0006} />
    <ScenarioDirectionalLight position={[8, 6, -7]} intensity={0.5} color="#a9c8df" />
    <DistantVista image={`/assets/scenarios/jade-vista-v1${quality === 'low' ? '-low' : ''}.webp`} />
    <JadeCourtFloor quality={quality} />
    <JadePavilion quality={quality} />
    <JadeMoonGate quality={quality} />
    <JadeBronzeDing quality={quality} />
    <AtmosphericPlumes vents={INCENSE} quality={quality} reducedMotion={reducedMotion} />
    {quality !== 'low' && <Sparkles count={quality === 'high' ? 22 : 10} scale={[13, 2.7, 12]}
      position={[0, 0.8, -1]} size={1.1} speed={reducedMotion ? 0 : 0.12} opacity={0.22} color="#e8d0a0" />}
  </>
}
