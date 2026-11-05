import { ScenarioAmbientLight, ScenarioHemisphereLight, ScenarioDirectionalLight } from './ScenarioLights'
import { Sparkles } from '@react-three/drei'
import type { AnimationEvent } from '../../game'
import type { GraphicsQuality } from '../../store/preferences'
import { AtmosphericPlumes, type PlumeVent } from '../materials/AtmosphericPlumes'
import { AncientOak } from './architecture/AncientOak'
import { DistantVista } from './architecture/DistantVista'
import { FernUnderstory } from './architecture/FernUnderstory'
import { ForestGround } from './architecture/ForestGround'
import { LeafLitter } from './architecture/LeafLitter'
import { OakCanopy } from './architecture/OakCanopy'
import { FilteredSunlight } from './architecture/FilteredSunlight'

interface GroveProps {
  readonly quality: GraphicsQuality
  readonly reducedMotion: boolean
  readonly event?: AnimationEvent
}

const MIST: readonly PlumeVent[] = [
  { position: [-6.8, -0.5, -5.3], spread: 4.6, height: 1.1, density: 0.11, color: '#9aab91', seed: 3 },
  { position: [7.3, -0.5, -7.5], spread: 5.5, height: 1.4, density: 0.1, color: '#a9b7a1', seed: 7 },
  { position: [0, -0.6, -12], spread: 7.5, height: 1.4, density: 0.12, color: '#a8b3a0', seed: 11 },
]

/** El árbol se concentra tras el Nexo: un cinturón completo de troncos
 * cruzaba la cámara. El claro conserva penumbra fría bajo una clave cálida,
 * sin conos luminosos sólidos ni musgo como rectángulos flotantes. */
export function VerdantGrove({ quality, reducedMotion }: GroveProps) {
  return <>
    <ScenarioAmbientLight intensity={0.27} color="#abb7a1" />
    <ScenarioHemisphereLight intensity={0.4} color="#d7e2cf" groundColor="#625b45" />
    <ScenarioDirectionalLight position={[-7, 13, 5]} intensity={quality === 'low' ? 1.95 : 1.4} color="#fff0cc"
      castShadow={quality !== 'low'} shadow-mapSize-width={quality === 'high' ? 2048 : 1024}
      shadow-mapSize-height={quality === 'high' ? 2048 : 1024}
      shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12}
      shadow-bias={-0.0006} />
    <ScenarioDirectionalLight position={[8, 7, -8]} intensity={0.5} color="#a6bcc0" />
    <FilteredSunlight quality={quality} />
    <DistantVista image={`/assets/scenarios/grove-vista-v1${quality === 'low' ? '-low' : ''}.webp`} />
    <ForestGround quality={quality} />
    <AncientOak quality={quality} />
    <OakCanopy quality={quality} />
    <LeafLitter quality={quality} />
    <FernUnderstory quality={quality} reducedMotion={reducedMotion} />
    <AtmosphericPlumes vents={MIST} quality={quality} reducedMotion={reducedMotion} />
    {quality !== 'low' && <Sparkles count={quality === 'high' ? 65 : 28}
      scale={[13, 4, 13]} position={[0, 1.8, -1]} size={1.3}
      speed={reducedMotion ? 0 : 0.12} opacity={0.35} color="#dfd7ac" />}
  </>
}
