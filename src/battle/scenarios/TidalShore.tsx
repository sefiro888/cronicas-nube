import { ScenarioAmbientLight, ScenarioHemisphereLight, ScenarioDirectionalLight } from './ScenarioLights'
import { Sparkles } from '@react-three/drei'
import type { AnimationEvent } from '../../game'
import type { GraphicsQuality } from '../../store/preferences'
import { AtmosphericPlumes, type PlumeVent } from '../materials/AtmosphericPlumes'
import { ReflectiveWater } from '../materials/ReflectiveWater'
import { BoneBeacon } from './architecture/BoneBeacon'
import { CoastalSlate } from './architecture/CoastalSlate'
import { DistantVista } from './architecture/DistantVista'
import { TidalFoam } from './architecture/TidalFoam'

interface TidalShoreProps {
  readonly quality: GraphicsQuality
  readonly reducedMotion: boolean
  readonly event?: AnimationEvent
}

const SPRAY: readonly PlumeVent[] = [
  { position: [-7.2, -0.65, -5.3], spread: 3.5, height: 1.3, density: 0.14, color: '#c0d0cc', seed: 4 },
  { position: [7.4, -0.7, -6.2], spread: 4.3, height: 1.1, density: 0.12, color: '#c5d4cf', seed: 8 },
  { position: [0, -0.8, -11], spread: 6.5, height: 1.1, density: 0.12, color: '#aebfc0', seed: 13 },
]

/** Mar profundo, roca estratificada y faro de hueso. Las costillas próximas
 * se sitúan dentro de la cámara real: el faro anterior a z=-24 no se veía.
 * Un solo reflejo sirve al mar y baja no necesita otra captura de escena. */
export function TidalShore({ quality, reducedMotion, event }: TidalShoreProps) {
  return <>
    <ScenarioAmbientLight intensity={0.27} color="#b1c5cb" />
    <ScenarioHemisphereLight intensity={0.36} color="#c5d7dd" groundColor="#565750" />
    <ScenarioDirectionalLight position={[-9, 11, 5]} intensity={2.2} color="#ffdfad"
      castShadow={quality !== 'low'} shadow-mapSize-width={quality === 'high' ? 2048 : 1024}
      shadow-mapSize-height={quality === 'high' ? 2048 : 1024}
      shadow-camera-left={-13} shadow-camera-right={13} shadow-camera-top={13} shadow-camera-bottom={-13}
      shadow-bias={-0.0006} />
    <ScenarioDirectionalLight position={[8, 7, -9]} intensity={0.58} color="#a1c2d2" />
    <DistantVista image={`/assets/scenarios/shore-vista-v1${quality === 'low' ? '-low' : ''}.webp`} />
    <ReflectiveWater quality={quality} reducedMotion={reducedMotion} ocean level={-0.76} radius={18} color="#20363d" />
    <CoastalSlate quality={quality} />
    <BoneBeacon quality={quality} reducedMotion={reducedMotion} />
    <TidalFoam quality={quality} reducedMotion={reducedMotion} event={event} />
    <AtmosphericPlumes vents={SPRAY} quality={quality} reducedMotion={reducedMotion} />
    {quality !== 'low' && <Sparkles count={quality === 'high' ? 32 : 14} scale={[16, 1.5, 14]}
      position={[0, 0.1, -1]} size={1.2} speed={reducedMotion ? 0 : 0.17} opacity={0.27} color="#d8e4df" />}
  </>
}
