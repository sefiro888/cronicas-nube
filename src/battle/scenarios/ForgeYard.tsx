import { ScenarioAmbientLight, ScenarioHemisphereLight, ScenarioDirectionalLight } from './ScenarioLights'
import { Sparkles } from '@react-three/drei'
import type { AnimationEvent } from '../../game'
import type { GraphicsQuality } from '../../store/preferences'
import { AtmosphericPlumes, type PlumeVent } from '../materials/AtmosphericPlumes'
import { CoupledGears } from './architecture/CoupledGears'
import { DistantVista } from './architecture/DistantVista'
import { FoundryFloor } from './architecture/FoundryFloor'
import { GuildFurnace } from './architecture/GuildFurnace'
import { MoltenRun } from './architecture/MoltenRun'

interface ForgeYardProps {
  readonly quality: GraphicsQuality
  readonly reducedMotion: boolean
  readonly event?: AnimationEvent
}

const STEAM: readonly PlumeVent[] = [
  { position: [1.25, 3.35, -7.15], spread: 2.8, height: 2.2, density: 0.22, color: '#a4adb0', seed: 3 },
  { position: [-6.7, -0.35, -4.8], spread: 2.3, height: 1.4, density: 0.16, color: '#bcc2c1', seed: 6 },
  { position: [6.4, -0.3, -4.5], spread: 2.5, height: 1.5, density: 0.15, color: '#bfc4c1', seed: 9 },
]

/** El horno y la transmisión están dentro de la cámara real. El calor se
 * concentra en el hogar y en una colada protegida por acero; una clave fría
 * conserva el hierro y separa este patio industrial de la geología de Furia. */
export function ForgeYard({ quality, reducedMotion, event }: ForgeYardProps) {
  return <>
    <ScenarioAmbientLight intensity={0.25} color="#bcc4c4" />
    <ScenarioHemisphereLight intensity={0.34} color="#ced9df" groundColor="#4e4438" />
    <ScenarioDirectionalLight position={[-7, 12, 6]} intensity={1.9} color="#d9e2e7"
      castShadow={quality !== 'low'} shadow-mapSize-width={quality === 'high' ? 2048 : 1024}
      shadow-mapSize-height={quality === 'high' ? 2048 : 1024}
      shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12}
      shadow-bias={-0.0006} />
    <ScenarioDirectionalLight position={[8, 6, -7]} intensity={0.48} color="#cfa577" />
    <DistantVista image={`/assets/scenarios/foundry-vista-v1${quality === 'low' ? '-low' : ''}.webp`} />
    <FoundryFloor quality={quality} />
    <GuildFurnace quality={quality} reducedMotion={reducedMotion} event={event} />
    <CoupledGears quality={quality} reducedMotion={reducedMotion} />
    <MoltenRun quality={quality} reducedMotion={reducedMotion} />
    <AtmosphericPlumes vents={STEAM} quality={quality} reducedMotion={reducedMotion} />
    {quality !== 'low' && <Sparkles count={quality === 'high' ? 32 : 14} scale={[13, 2.7, 12]}
      position={[0, 1, -1]} size={1.25} speed={reducedMotion ? 0 : 0.24} opacity={0.32} color="#d7b383" />}
  </>
}
